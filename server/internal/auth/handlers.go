package auth

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"

	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

var (
	errInvalidCredentials = httpx.NewError(http.StatusUnauthorized, "invalid_credentials", "Invalid username or password.")
	errInvalidCode        = httpx.NewError(http.StatusUnauthorized, "invalid_code", "Invalid code.")
	errTOTPEnabled        = httpx.NewError(http.StatusConflict, "totp_already_enabled", "Two-factor authentication is already enabled.")
	errTOTPNotSetUp       = httpx.NewError(http.StatusConflict, "totp_not_set_up", "Start two-factor setup first.")

	sessionIDPrefix = regexp.MustCompile(`^[0-9a-f]{12}$`)
)

// Handler serves /api/auth and provides the session middleware.
type Handler struct {
	DB  *sql.DB
	Cfg config.Config
	Now func() time.Time

	GitHub *GitHubOAuth // nil when GitHub sign-in is not configured

	dummyHash string // compared against for unknown users to keep timing flat

	// limitMu guards only the check-and-pre-charge step of reserve, never
	// the (slow) credential verification itself.
	limitMu sync.Mutex
}

// NewHandler builds a Handler using the wall clock.
func NewHandler(db *sql.DB, cfg config.Config) *Handler {
	dummy, err := HashPassword(RandomToken(16))
	if err != nil {
		panic(err) // bcrypt only fails on invalid cost
	}
	h := &Handler{DB: db, Cfg: cfg, Now: time.Now, dummyHash: dummy}
	if cfg.GitHubEnabled() {
		h.GitHub = newGitHubOAuth(cfg)
	}
	return h
}

// ClientIP returns the request's client address, honouring the trusted proxy.
func (h *Handler) ClientIP(r *http.Request) string {
	return httpx.ClientIP(r, h.Cfg.TrustedProxy)
}

// Mount registers the /api/auth endpoints. LoadSession must already be in the chain.
func (h *Handler) Mount(r chi.Router) {
	r.Route("/api/auth", func(ar chi.Router) {
		ar.Get("/providers", h.providers)
		ar.Post("/login", h.login)
		ar.Post("/totp/setup", h.totpSetup)
		ar.Post("/totp/verify", h.totpVerify)
		ar.Post("/recovery", h.recovery)
		ar.Post("/logout", h.logout)
		ar.Get("/github/start", h.githubStart)
		ar.Get("/github/callback", h.githubCallback)
		ar.Group(func(fr chi.Router) {
			fr.Use(RequireFull, RequireCSRF)
			fr.Get("/me", h.me)
			fr.Post("/logout-all", h.logoutAll)
			fr.Get("/sessions", h.sessions)
			fr.Delete("/sessions/{id}", h.deleteSession)
			fr.Post("/recovery-codes/regenerate", h.regenerate)
			fr.Post("/github/link", h.githubLink)
			fr.Post("/github/unlink", h.githubUnlink)
		})
	})
}

/* -------------------------------------------------------------------------- */
/* Cookies                                                                    */
/* -------------------------------------------------------------------------- */

func (h *Handler) setSessionCookie(w http.ResponseWriter, token string, ttl time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: token, Path: "/", HttpOnly: true,
		Secure: h.Cfg.CookieSecure, SameSite: http.SameSiteStrictMode, MaxAge: int(ttl.Seconds()),
	})
}

func (h *Handler) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: "", Path: "/", HttpOnly: true,
		Secure: h.Cfg.CookieSecure, SameSite: http.SameSiteStrictMode, MaxAge: -1,
	})
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

// passwordStage returns the current password-stage session or writes 401.
func passwordStage(w http.ResponseWriter, r *http.Request) (current, bool) {
	c, ok := currentFrom(r.Context())
	if !ok || c.Stage != StagePassword {
		httpx.Fail(w, httpx.ErrUnauthorized)
		return current{}, false
	}
	return c, true
}

var totpOpts = totp.ValidateOpts{Period: 30, Skew: 1, Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1}

// validTOTP checks code against the admin's stored (encrypted) secret for the
// time steps now-1, now and now+1. A matching step is accepted only if it is
// newer than the last accepted one, which is then persisted atomically, so a
// code can never be replayed.
func (h *Handler) validTOTP(ctx context.Context, a Admin, code string) (bool, error) {
	code = strings.TrimSpace(code)
	if len(a.TOTPSecretEnc) == 0 || len(code) != int(totpOpts.Digits) {
		return false, nil
	}
	secret, err := Decrypt(h.Cfg.TOTPKey, a.TOTPSecretEnc)
	if err != nil {
		return false, err
	}
	period := int64(totpOpts.Period)
	cur := h.Now().Unix() / period
	for step := cur - int64(totpOpts.Skew); step <= cur+int64(totpOpts.Skew); step++ {
		want, err := totp.GenerateCodeCustom(string(secret), time.Unix(step*period, 0).UTC(), totpOpts)
		if err != nil {
			return false, err
		}
		if subtle.ConstantTimeCompare([]byte(want), []byte(code)) != 1 {
			continue
		}
		if step <= a.TOTPLastStep {
			return false, nil
		}
		res, err := h.DB.ExecContext(ctx, `UPDATE admins SET totp_last_step=? WHERE id=? AND totp_last_step<?`, step, a.ID, step)
		if err != nil {
			return false, err
		}
		n, err := res.RowsAffected()
		return n == 1, err
	}
	return false, nil
}

// finishLogin runs fn and the password→full session upgrade in one
// transaction, then sets the rotated cookie and clears the attempt counters.
// A password-stage session that vanished or expired meanwhile yields 401.
func (h *Handler) finishLogin(w http.ResponseWriter, r *http.Request, c current, keys []string, fn func(tx *sql.Tx) error) error {
	ctx := r.Context()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err := fn(tx); err != nil {
		return err
	}
	token, _, err := upgradeTx(ctx, tx, c.Token, h.Now())
	if errors.Is(err, sql.ErrNoRows) {
		return httpx.ErrUnauthorized
	}
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	h.setSessionCookie(w, token, TTLFull)
	h.clearFailures(ctx, keys...)
	return nil
}

// storeRecoveryCodes replaces the admin's recovery codes inside tx.
func storeRecoveryCodes(ctx context.Context, tx *sql.Tx, adminID int64) ([]string, error) {
	plain, hashes := NewRecoveryCodes()
	if _, err := tx.ExecContext(ctx, `DELETE FROM recovery_codes WHERE admin_id=?`, adminID); err != nil {
		return nil, err
	}
	for _, hash := range hashes {
		if _, err := tx.ExecContext(ctx, `INSERT INTO recovery_codes(admin_id,code_hash) VALUES(?,?)`, adminID, hash); err != nil {
			return nil, err
		}
	}
	return plain, nil
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

func (h *Handler) providers(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"github": h.GitHub != nil})
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	ctx, ip := r.Context(), h.ClientIP(r)
	charge, ok := h.reserve(w, r, ip)
	if !ok {
		return
	}
	defer h.release(ctx, charge)
	a, err := AdminByUsername(ctx, h.DB, in.Username)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		httpx.Fail(w, err)
		return
	}
	if err != nil {
		CheckPassword(h.dummyHash, in.Password)
	}
	if err != nil || !CheckPassword(a.PasswordHash, in.Password) {
		charge.keep()
		audit.Log(ctx, h.DB, a.ID, "login.password_failed", "admin", in.Username, ip)
		httpx.Fail(w, errInvalidCredentials)
		return
	}
	token, _, err := CreateSession(ctx, h.DB, a.ID, StagePassword, "password", ip, r.UserAgent(), h.Now())
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	h.setSessionCookie(w, token, TTLPassword)
	audit.Log(ctx, h.DB, a.ID, "login.password_ok", "admin", a.Username, ip)
	next := "totp_setup"
	if a.TOTPEnabled {
		next = "totp"
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"next": next})
}

func (h *Handler) totpSetup(w http.ResponseWriter, r *http.Request) {
	c, ok := passwordStage(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	a, err := AdminByID(ctx, h.DB, c.AdminID)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if a.TOTPEnabled {
		httpx.Fail(w, errTOTPEnabled)
		return
	}
	issuer := "prommin.dev"
	if u, err := url.Parse(h.Cfg.PublicURL); err == nil && u.Hostname() != "" {
		issuer = u.Hostname()
	}
	key, err := totp.Generate(totp.GenerateOpts{Issuer: issuer, AccountName: a.Username})
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	enc, err := Encrypt(h.Cfg.TOTPKey, []byte(key.Secret()))
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if _, err := h.DB.ExecContext(ctx, `UPDATE admins SET totp_secret_enc=? WHERE id=? AND totp_enabled=0`, enc, a.ID); err != nil {
		httpx.Fail(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"secret": key.Secret(), "otpauthUrl": key.URL()})
}

func (h *Handler) totpVerify(w http.ResponseWriter, r *http.Request) {
	c, ok := passwordStage(w, r)
	if !ok {
		return
	}
	var in struct {
		Code string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	ctx, ip := r.Context(), h.ClientIP(r)
	keys := []string{ip, accountKey(c.AdminID)}
	charge, ok := h.reserve(w, r, keys...)
	if !ok {
		return
	}
	defer h.release(ctx, charge)
	a, err := AdminByID(ctx, h.DB, c.AdminID)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if len(a.TOTPSecretEnc) == 0 {
		httpx.Fail(w, errTOTPNotSetUp)
		return
	}
	valid, err := h.validTOTP(ctx, a, in.Code)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if !valid {
		charge.keep()
		audit.Log(ctx, h.DB, a.ID, "login.totp_failed", "admin", a.Username, ip)
		httpx.Fail(w, errInvalidCode)
		return
	}
	var codes []string
	err = h.finishLogin(w, r, c, keys, func(tx *sql.Tx) error {
		if a.TOTPEnabled {
			return nil
		}
		res, err := tx.ExecContext(ctx, `UPDATE admins SET totp_enabled=1 WHERE id=? AND totp_enabled=0`, a.ID)
		if err != nil {
			return err
		}
		if n, err := res.RowsAffected(); err != nil || n != 1 {
			return errors.Join(errTOTPEnabled, err)
		}
		codes, err = storeRecoveryCodes(ctx, tx, a.ID)
		return err
	})
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if codes != nil {
		audit.Log(ctx, h.DB, a.ID, "totp.setup", "admin", a.Username, ip)
		httpx.WriteJSON(w, http.StatusOK, map[string][]string{"recoveryCodes": codes})
		return
	}
	audit.Log(ctx, h.DB, a.ID, "login.totp", "admin", a.Username, ip)
	httpx.WriteJSON(w, http.StatusOK, struct{}{})
}

func (h *Handler) recovery(w http.ResponseWriter, r *http.Request) {
	c, ok := passwordStage(w, r)
	if !ok {
		return
	}
	var in struct {
		Code string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	ctx, ip := r.Context(), h.ClientIP(r)
	keys := []string{ip, accountKey(c.AdminID)}
	charge, ok := h.reserve(w, r, keys...)
	if !ok {
		return
	}
	defer h.release(ctx, charge)
	// The code is consumed by a conditional UPDATE in the same transaction as
	// the session upgrade: it is used at most once and never burned for nothing.
	err := h.finishLogin(w, r, c, keys, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `UPDATE recovery_codes SET used_at=?
			WHERE id = (SELECT rc.id FROM recovery_codes rc JOIN admins a ON a.id = rc.admin_id
				WHERE rc.admin_id=? AND a.totp_enabled=1 AND rc.code_hash=? AND rc.used_at IS NULL LIMIT 1)
			AND used_at IS NULL`,
			store.FormatTime(h.Now()), c.AdminID, SHA256Hex(strings.ToLower(strings.TrimSpace(in.Code))))
		if err != nil {
			return err
		}
		if n, err := res.RowsAffected(); err != nil || n != 1 {
			return errors.Join(errInvalidCode, err)
		}
		return nil
	})
	if errors.Is(err, errInvalidCode) {
		charge.keep()
		audit.Log(ctx, h.DB, c.AdminID, "login.recovery_failed", "admin", "", ip)
	}
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	audit.Log(ctx, h.DB, c.AdminID, "login.recovery", "admin", "", ip)
	httpx.WriteJSON(w, http.StatusOK, struct{}{})
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	c, _ := currentFrom(r.Context())
	a, err := AdminByID(r.Context(), h.DB, c.AdminID)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	var gh *string
	if a.GitHubLogin.Valid {
		gh = &a.GitHubLogin.String
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"username": a.Username, "githubLogin": gh, "totpEnabled": a.TOTPEnabled,
		"authMethod": c.Method, "csrfToken": c.CSRF,
	})
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	c, ok := currentFrom(r.Context())
	if ok && c.Stage == StageFull && !csrfOK(r, c.Session) {
		httpx.Fail(w, errCSRF)
		return
	}
	if ok {
		if err := DeleteSession(r.Context(), h.DB, c.ID); err != nil {
			httpx.Fail(w, err)
			return
		}
		audit.Log(r.Context(), h.DB, c.AdminID, "logout", "session", c.ID[:12], h.ClientIP(r))
	}
	h.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) logoutAll(w http.ResponseWriter, r *http.Request) {
	c, _ := currentFrom(r.Context())
	if err := DeleteAdminSessions(r.Context(), h.DB, c.AdminID); err != nil {
		httpx.Fail(w, err)
		return
	}
	audit.Log(r.Context(), h.DB, c.AdminID, "logout_all", "admin", "", h.ClientIP(r))
	h.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

type sessionJSON struct {
	ID         string `json:"id"`
	IP         string `json:"ip"`
	UserAgent  string `json:"userAgent"`
	AuthMethod string `json:"authMethod"`
	CreatedAt  string `json:"createdAt"`
	ExpiresAt  string `json:"expiresAt"`
	Current    bool   `json:"current"`
}

func (h *Handler) sessions(w http.ResponseWriter, r *http.Request) {
	c, _ := currentFrom(r.Context())
	list, err := ListSessions(r.Context(), h.DB, c.AdminID, h.Now())
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	items := make([]sessionJSON, 0, len(list))
	for _, s := range list {
		items = append(items, sessionJSON{
			ID: s.ID[:12], IP: s.IP, UserAgent: s.UserAgent, AuthMethod: s.Method,
			CreatedAt: s.CreatedAt, ExpiresAt: s.ExpiresAt, Current: s.ID == c.ID,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) deleteSession(w http.ResponseWriter, r *http.Request) {
	c, _ := currentFrom(r.Context())
	id := chi.URLParam(r, "id")
	if !sessionIDPrefix.MatchString(id) {
		httpx.Fail(w, httpx.ErrNotFound)
		return
	}
	res, err := h.DB.ExecContext(r.Context(), `DELETE FROM sessions WHERE admin_id=? AND substr(id,1,12)=?`, c.AdminID, id)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		httpx.Fail(w, httpx.ErrNotFound)
		return
	}
	audit.Log(r.Context(), h.DB, c.AdminID, "session.revoke", "session", id, h.ClientIP(r))
	if strings.HasPrefix(c.ID, id) {
		h.clearSessionCookie(w)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) regenerate(w http.ResponseWriter, r *http.Request) {
	c, _ := currentFrom(r.Context())
	var in struct {
		Code string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	a, ok := h.stepUp(w, r, c, in.Code, "recovery_codes.regenerate_failed")
	if !ok {
		return
	}
	ctx := r.Context()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	defer func() { _ = tx.Rollback() }()
	codes, err := storeRecoveryCodes(ctx, tx, a.ID)
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	audit.Log(ctx, h.DB, a.ID, "recovery_codes.regenerate", "admin", a.Username, h.ClientIP(r))
	httpx.WriteJSON(w, http.StatusOK, map[string][]string{"recoveryCodes": codes})
}
