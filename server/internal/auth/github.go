package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"golang.org/x/oauth2"
	oauthgithub "golang.org/x/oauth2/github"

	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

const (
	stateCookie   = "oauth_state"
	stateTTL      = 10 * time.Minute
	githubTimeout = 10 * time.Second
	githubUser    = "https://api.github.com/user"
	modeLogin     = "login"
	modeLink      = "link"
	loginErrPath  = "/admin/login?error="
)

var (
	errGitHubDisabled = httpx.NewError(http.StatusNotFound, "github_disabled", "GitHub sign-in is not configured.")
)

// GitHubOAuth holds the OAuth client and the user-info endpoint (overridable in tests).
type GitHubOAuth struct {
	Conf    *oauth2.Config
	UserURL string
}

func newGitHubOAuth(cfg config.Config) *GitHubOAuth {
	return &GitHubOAuth{
		Conf: &oauth2.Config{
			ClientID:     cfg.GitHubClientID,
			ClientSecret: cfg.GitHubClientSecret,
			RedirectURL:  cfg.PublicURL + "/api/auth/github/callback",
			Scopes:       []string{"read:user"},
			Endpoint:     oauthgithub.Endpoint,
		},
		UserURL: githubUser,
	}
}

/* -------------------------------------------------------------------------- */
/* State cookie                                                               */
/* -------------------------------------------------------------------------- */

func (h *Handler) signState(payload string) string {
	m := hmac.New(sha256.New, h.Cfg.SessionSecret)
	m.Write([]byte(payload))
	return hex.EncodeToString(m.Sum(nil))
}

// stateValue is base64url(state|mode|expiryUnix|adminID) "." hex(HMAC). adminID
// is 0 for login. The session cookie is SameSite=Strict, so it is not sent on
// the redirect back from GitHub; a link therefore carries the admin id it was
// started for inside the signed state.
func (h *Handler) stateValue(state, mode string, adminID int64, exp time.Time) string {
	payload := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%s|%s|%d|%d", state, mode, exp.Unix(), adminID)))
	return payload + "." + h.signState(payload)
}

func (h *Handler) parseState(value string) (state, mode string, adminID int64, ok bool) {
	payload, sig, found := strings.Cut(value, ".")
	if !found || !hmac.Equal([]byte(sig), []byte(h.signState(payload))) {
		return "", "", 0, false
	}
	raw, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return "", "", 0, false
	}
	parts := strings.Split(string(raw), "|")
	if len(parts) != 4 {
		return "", "", 0, false
	}
	exp, err1 := strconv.ParseInt(parts[2], 10, 64)
	id, err2 := strconv.ParseInt(parts[3], 10, 64)
	if err1 != nil || err2 != nil || h.Now().Unix() > exp {
		return "", "", 0, false
	}
	return parts[0], parts[1], id, true
}

func (h *Handler) setStateCookie(w http.ResponseWriter, value string) {
	http.SetCookie(w, &http.Cookie{
		Name: stateCookie, Value: value, Path: "/api/auth/github", HttpOnly: true,
		Secure: h.Cfg.CookieSecure, SameSite: http.SameSiteLaxMode, MaxAge: int(stateTTL.Seconds()),
	})
}

func (h *Handler) clearStateCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: stateCookie, Value: "", Path: "/api/auth/github", HttpOnly: true,
		Secure: h.Cfg.CookieSecure, SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

func (h *Handler) githubStart(w http.ResponseWriter, r *http.Request) {
	if h.GitHub == nil {
		httpx.Fail(w, errGitHubDisabled)
		return
	}
	if r.URL.Query().Get("mode") != modeLogin {
		httpx.Fail(w, httpx.Validation(map[string]string{"mode": "must be login; linking uses POST /api/auth/github/link"}))
		return
	}
	state := RandomToken(24)
	h.setStateCookie(w, h.stateValue(state, modeLogin, 0, h.Now().Add(stateTTL)))
	http.Redirect(w, r, h.GitHub.Conf.AuthCodeURL(state), http.StatusFound)
}

// githubIdentity exchanges code and returns the GitHub account id and login.
func (h *Handler) githubIdentity(ctx context.Context, code string) (int64, string, error) {
	ctx = context.WithValue(ctx, oauth2.HTTPClient, &http.Client{Timeout: githubTimeout})
	tok, err := h.GitHub.Conf.Exchange(ctx, code)
	if err != nil {
		return 0, "", err
	}
	res, err := h.GitHub.Conf.Client(ctx, tok).Get(h.GitHub.UserURL)
	if err != nil {
		return 0, "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 0, "", fmt.Errorf("github user: status %d", res.StatusCode)
	}
	var u struct {
		ID    int64  `json:"id"`
		Login string `json:"login"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&u); err != nil {
		return 0, "", err
	}
	if u.ID <= 0 || u.Login == "" {
		return 0, "", errors.New("github user: missing id or login")
	}
	return u.ID, u.Login, nil
}

func (h *Handler) githubCallback(w http.ResponseWriter, r *http.Request) {
	if h.GitHub == nil {
		httpx.Fail(w, errGitHubDisabled)
		return
	}
	// This is a browser navigation back from GitHub, so every failure redirects
	// to a page that can show it. A missing, forged or expired state cookie has
	// no trustworthy mode: send it to the login page.
	failTo := loginErrPath + "github_failed"
	ck, err := r.Cookie(stateCookie)
	if err != nil {
		http.Redirect(w, r, failTo, http.StatusFound)
		return
	}
	h.clearStateCookie(w)
	state, mode, adminID, ok := h.parseState(ck.Value)
	if ok && mode == modeLink {
		failTo = "/admin/settings?error=github_failed"
	}
	q := r.URL.Query().Get("state")
	if !ok || q == "" || !hmac.Equal([]byte(q), []byte(state)) {
		http.Redirect(w, r, failTo, http.StatusFound)
		return
	}
	ctx, ip := r.Context(), h.ClientIP(r)
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Redirect(w, r, failTo, http.StatusFound)
		return
	}
	ghID, ghLogin, err := h.githubIdentity(ctx, code)
	if err != nil {
		slog.Error("github oauth failed", "err", err)
		http.Redirect(w, r, failTo, http.StatusFound)
		return
	}

	if mode == modeLink {
		// A session, when the browser sent one, must belong to the admin who started the link.
		if s, has := SessionFrom(ctx); has && (s.Stage != StageFull || s.AdminID != adminID) {
			httpx.Fail(w, httpx.ErrUnauthorized)
			return
		}
		if adminID == 0 {
			http.Redirect(w, r, failTo, http.StatusFound)
			return
		}
		if _, err := h.DB.ExecContext(ctx, `UPDATE admins SET github_id=?, github_login=? WHERE id=?`, ghID, ghLogin, adminID); err != nil {
			if store.IsUniqueViolation(err) {
				audit.Log(ctx, h.DB, adminID, "github.link_conflict", "admin", ghLogin, ip)
				http.Redirect(w, r, "/admin/settings?error=github_in_use", http.StatusFound)
				return
			}
			slog.Error("github link failed", "err", err)
			http.Redirect(w, r, failTo, http.StatusFound)
			return
		}
		audit.Log(ctx, h.DB, adminID, "github.link", "admin", ghLogin, ip)
		http.Redirect(w, r, "/admin/settings?linked=1", http.StatusFound)
		return
	}

	a, err := AdminByGitHubID(ctx, h.DB, ghID)
	if errors.Is(err, sql.ErrNoRows) {
		audit.Log(ctx, h.DB, 0, "login.github_denied", "admin", ghLogin, ip)
		http.Redirect(w, r, loginErrPath+"github_not_linked", http.StatusFound)
		return
	}
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	token, _, err := CreateSession(ctx, h.DB, a.ID, StageFull, "github", ip, r.UserAgent(), h.Now())
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	h.setSessionCookie(w, token, TTLFull)
	audit.Log(ctx, h.DB, a.ID, "login.github", "admin", a.Username, ip)
	http.Redirect(w, r, "/admin", http.StatusFound)
}

// stepUp validates a TOTP code for the session's admin under the shared rate
// limit (IP + account). On failure it writes the response, keeps the
// pre-charged failure and audits failAction; on success the charge is
// refunded and it returns the admin. A step-up never clears earlier failures:
// only finishLogin (reaching the full stage) does that.
func (h *Handler) stepUp(w http.ResponseWriter, r *http.Request, c current, code, failAction string) (Admin, bool) {
	ctx, ip := r.Context(), h.ClientIP(r)
	keys := []string{ip, accountKey(c.AdminID)}
	charge, ok := h.reserve(w, r, keys...)
	if !ok {
		return Admin{}, false
	}
	defer h.release(ctx, charge)
	a, err := AdminByID(ctx, h.DB, c.AdminID)
	if err != nil {
		httpx.Fail(w, err)
		return Admin{}, false
	}
	valid := false
	if a.TOTPEnabled {
		if valid, err = h.validTOTP(ctx, a, code); err != nil {
			httpx.Fail(w, err)
			return Admin{}, false
		}
	}
	if !valid {
		charge.keep()
		audit.Log(ctx, h.DB, a.ID, failAction, "admin", a.Username, ip)
		httpx.Fail(w, errInvalidCode)
		return Admin{}, false
	}
	return a, true
}

// githubLink verifies a TOTP code, then arms the state cookie for a link flow
// and returns the GitHub authorize URL. Linking is step-up protected because a
// linked account signs in without a second factor.
func (h *Handler) githubLink(w http.ResponseWriter, r *http.Request) {
	if h.GitHub == nil {
		httpx.Fail(w, errGitHubDisabled)
		return
	}
	c, _ := currentFrom(r.Context())
	var in struct {
		Code string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	a, ok := h.stepUp(w, r, c, in.Code, "github.link_failed")
	if !ok {
		return
	}
	state := RandomToken(24)
	h.setStateCookie(w, h.stateValue(state, modeLink, a.ID, h.Now().Add(stateTTL)))
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"url": h.GitHub.Conf.AuthCodeURL(state)})
}

func (h *Handler) githubUnlink(w http.ResponseWriter, r *http.Request) {
	c, _ := currentFrom(r.Context())
	var in struct {
		Code string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	ctx := r.Context()
	a, ok := h.stepUp(w, r, c, in.Code, "github.unlink_failed")
	if !ok {
		return
	}
	if _, err := h.DB.ExecContext(ctx, `UPDATE admins SET github_id=NULL, github_login=NULL WHERE id=?`, a.ID); err != nil {
		httpx.Fail(w, err)
		return
	}
	audit.Log(ctx, h.DB, a.ID, "github.unlink", "admin", a.Username, h.ClientIP(r))
	w.WriteHeader(http.StatusNoContent)
}
