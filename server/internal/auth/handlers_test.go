package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/pquerna/otp/totp"

	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

type client struct {
	t    *testing.T
	base string
	c    *http.Client
	csrf string
	now  time.Time // the handler's frozen clock
}

// frozenClock pins h.Now so TOTP time steps are deterministic in tests.
func frozenClock(h *Handler) time.Time {
	t0 := time.Now()
	h.Now = func() time.Time { return t0 }
	return t0
}

// code returns the TOTP code for the time step `step` steps from the frozen now.
func (c *client) code(secret string, step int) string {
	code, err := totp.GenerateCode(secret, c.now.Add(time.Duration(step)*30*time.Second))
	if err != nil {
		c.t.Fatal(err)
	}
	return code
}

func newEnv(t *testing.T) (*client, *Handler) {
	t.Helper()
	db := storetest.New(t)
	if err := Bootstrap(context.Background(), db, "admin", "very-long-password"); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{PublicURL: "http://example.test", TOTPKey: bytes.Repeat([]byte{1}, 32), SessionSecret: bytes.Repeat([]byte{2}, 32)}
	h := NewHandler(db, cfg)
	now := frozenClock(h)
	r := chi.NewRouter()
	r.Use(h.LoadSession)
	h.Mount(r)
	h.AdminGroup(r, func(ar chi.Router) {
		ar.Get("/ping", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
		ar.Post("/ping", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	})
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	jar, _ := cookiejar.New(nil)
	return &client{t: t, base: srv.URL, c: &http.Client{Jar: jar}, now: now}, h
}

// fresh returns a new cookie-less client against the same server and clock.
func (c *client) fresh() *client {
	jar, _ := cookiejar.New(nil)
	return &client{t: c.t, base: c.base, c: &http.Client{Jar: jar, CheckRedirect: c.c.CheckRedirect}, now: c.now}
}

func (c *client) do(method, path string, body any) (*http.Response, map[string]any) {
	c.t.Helper()
	var rd *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	} else {
		rd = bytes.NewReader(nil)
	}
	req, _ := http.NewRequest(method, c.base+path, rd)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.csrf != "" {
		req.Header.Set("X-CSRF-Token", c.csrf)
	}
	res, err := c.c.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()
	var m map[string]any
	_ = json.NewDecoder(res.Body).Decode(&m)
	return res, m
}

// loginFull performs password + TOTP setup + verify and returns the TOTP secret.
func loginFull(t *testing.T, c *client) string {
	res, m := c.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	if res.StatusCode != 200 || m["next"] != "totp_setup" {
		t.Fatalf("login: %d %v", res.StatusCode, m)
	}
	_, m = c.do("POST", "/api/auth/totp/setup", nil)
	secret := m["secret"].(string)
	if !strings.HasPrefix(m["otpauthUrl"].(string), "otpauth://totp/") {
		t.Fatalf("otpauth: %v", m)
	}
	// Step -1 leaves steps 0 and +1 for later logins in the same test.
	res, m = c.do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, -1)})
	if res.StatusCode != 200 || len(m["recoveryCodes"].([]any)) != 8 {
		t.Fatalf("verify: %d %v", res.StatusCode, m)
	}
	_, me := c.do("GET", "/api/auth/me", nil)
	c.csrf = me["csrfToken"].(string)
	return secret
}

func TestFullPasswordTotpFlow(t *testing.T) {
	c, _ := newEnv(t)
	secret := loginFull(t, c)
	if res, _ := c.do("POST", "/api/admin/ping", nil); res.StatusCode != 200 {
		t.Fatalf("admin with csrf: %d", res.StatusCode)
	}
	_, me := c.do("GET", "/api/auth/me", nil)
	if me["username"] != "admin" || me["totpEnabled"] != true || me["authMethod"] != "password" {
		t.Fatalf("me: %v", me)
	}
	if v, ok := me["githubLogin"]; !ok || v != nil {
		t.Fatalf("githubLogin must be null: %v", me)
	}
	// second login now asks for totp, not setup
	c2 := c.fresh()
	res, m := c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	if res.StatusCode != 200 || m["next"] != "totp" {
		t.Fatalf("second login: %v", m)
	}
	if res, _ := c2.do("POST", "/api/auth/totp/setup", nil); res.StatusCode != 409 {
		t.Fatalf("setup when enabled: %d", res.StatusCode)
	}
	if res, m := c2.do("POST", "/api/auth/totp/verify", map[string]string{"code": "000000"}); res.StatusCode != 401 || m["error"].(map[string]any)["code"] != "invalid_code" {
		t.Fatalf("bad code: %d %v", res.StatusCode, m)
	}
	code := c.code(secret, 0)
	if res, _ := c2.do("POST", "/api/auth/totp/verify", map[string]string{"code": code}); res.StatusCode != 200 {
		t.Fatal("second verify failed")
	}
}

func TestPasswordStageCannotReachAdmin(t *testing.T) {
	c, _ := newEnv(t)
	c.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	if res, _ := c.do("GET", "/api/admin/ping", nil); res.StatusCode != 401 {
		t.Fatalf("password-stage admin access: %d", res.StatusCode)
	}
	if res, _ := c.do("GET", "/api/auth/me", nil); res.StatusCode != 401 {
		t.Fatalf("password-stage me: %d", res.StatusCode)
	}
}

func TestCSRFRequired(t *testing.T) {
	c, _ := newEnv(t)
	loginFull(t, c)
	c.csrf = ""
	if res, m := c.do("POST", "/api/admin/ping", nil); res.StatusCode != 403 || m["error"].(map[string]any)["code"] != "csrf_failed" {
		t.Fatalf("missing csrf: %d %v", res.StatusCode, m)
	}
	if res, _ := c.do("GET", "/api/admin/ping", nil); res.StatusCode != 200 {
		t.Fatal("GET must not need csrf")
	}
}

func TestBadPasswordAndRateLimit(t *testing.T) {
	c, _ := newEnv(t)
	for i := 0; i < 5; i++ {
		res, m := c.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "nope"})
		if res.StatusCode != 401 || m["error"].(map[string]any)["code"] != "invalid_credentials" {
			t.Fatalf("attempt %d: %d %v", i, res.StatusCode, m)
		}
	}
	res, _ := c.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	if res.StatusCode != 429 || res.Header.Get("Retry-After") == "" {
		t.Fatalf("6th attempt must be rate limited even with correct password: %d", res.StatusCode)
	}
	if res, m := c.do("POST", "/api/auth/login", map[string]string{"username": "ghost", "password": "x"}); res.StatusCode != 429 {
		t.Fatalf("unknown user while limited: %d %v", res.StatusCode, m)
	}
}

func TestRegenerateRequiresValidTotp(t *testing.T) {
	c, _ := newEnv(t)
	loginFull(t, c)
	res, m := c.do("POST", "/api/auth/recovery-codes/regenerate", map[string]string{"code": "000000"})
	if res.StatusCode != 401 || m["error"] == nil {
		t.Fatalf("regenerate with wrong totp must fail: %d %v", res.StatusCode, m)
	}
}

func TestRecoveryLogin(t *testing.T) {
	c, _ := newEnv(t)
	secret := loginFull(t, c)
	code := c.code(secret, 0)
	_, m := c.do("POST", "/api/auth/recovery-codes/regenerate", map[string]string{"code": code})
	codes := m["recoveryCodes"].([]any)
	c.do("POST", "/api/auth/logout", nil)
	c.csrf = ""
	use := func() int {
		c.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
		res, _ := c.do("POST", "/api/auth/recovery", map[string]string{"code": codes[0].(string)})
		return res.StatusCode
	}
	if s := use(); s != 200 {
		t.Fatalf("first use: %d", s)
	}
	_, me := c.do("GET", "/api/auth/me", nil)
	c.csrf, _ = me["csrfToken"].(string)
	if res, _ := c.do("POST", "/api/auth/logout", nil); res.StatusCode != 204 {
		t.Fatalf("logout: %d", res.StatusCode)
	}
	c.csrf = ""
	if s := use(); s != 401 {
		t.Fatalf("second use must fail: %d", s)
	}
}

func TestLogoutAllAndSessions(t *testing.T) {
	c, _ := newEnv(t)
	loginFull(t, c)
	_, m := c.do("GET", "/api/auth/sessions", nil)
	items := m["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["current"] != true {
		t.Fatalf("sessions: %v", m)
	}
	if res, _ := c.do("POST", "/api/auth/logout-all", nil); res.StatusCode != 204 {
		t.Fatal("logout-all")
	}
	if res, _ := c.do("GET", "/api/auth/me", nil); res.StatusCode != 401 {
		t.Fatal("session must be gone")
	}
}

func TestProvidersAndDeleteSession(t *testing.T) {
	c, _ := newEnv(t)
	if _, m := c.do("GET", "/api/auth/providers", nil); m["github"] != false {
		t.Fatalf("providers: %v", m)
	}
	secret := loginFull(t, c)
	c2 := c.fresh()
	c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	code := c.code(secret, 0)
	c2.do("POST", "/api/auth/totp/verify", map[string]string{"code": code})
	_, m := c.do("GET", "/api/auth/sessions", nil)
	items := m["items"].([]any)
	if len(items) != 2 {
		t.Fatalf("want 2 sessions: %v", m)
	}
	var other string
	for _, it := range items {
		s := it.(map[string]any)
		if len(s["id"].(string)) != 12 {
			t.Fatalf("id must be 12 chars: %v", s)
		}
		if s["current"] == false {
			other = s["id"].(string)
		}
	}
	if res, _ := c.do("DELETE", "/api/auth/sessions/"+other, nil); res.StatusCode != 204 {
		t.Fatalf("delete: %d", res.StatusCode)
	}
	if res, _ := c.do("DELETE", "/api/auth/sessions/"+other, nil); res.StatusCode != 404 {
		t.Fatalf("delete again: %d", res.StatusCode)
	}
	if res, _ := c2.do("GET", "/api/auth/me", nil); res.StatusCode != 401 {
		t.Fatalf("deleted session must be gone: %d", res.StatusCode)
	}
}

func TestTotpFailuresSurvivePasswordRelogin(t *testing.T) {
	c, _ := newEnv(t)
	loginFull(t, c)
	c2 := c.fresh()
	for i := 0; i < 5; i++ {
		c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
		if res, _ := c2.do("POST", "/api/auth/totp/verify", map[string]string{"code": "000000"}); res.StatusCode != 401 {
			t.Fatalf("attempt %d: %d", i, res.StatusCode)
		}
	}
	if res, _ := c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"}); res.StatusCode != 429 {
		t.Fatalf("a correct password must not reset TOTP failures: %d", res.StatusCode)
	}
}

func TestTotpReplayRejected(t *testing.T) {
	c, _ := newEnv(t)
	secret := loginFull(t, c)
	login := func() *client {
		cl := c.fresh()
		if res, _ := cl.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"}); res.StatusCode != 200 {
			t.Fatalf("login: %d", res.StatusCode)
		}
		return cl
	}
	if res, _ := login().do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, 0)}); res.StatusCode != 200 {
		t.Fatalf("first use: %d", res.StatusCode)
	}
	c3 := login()
	if res, m := c3.do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, 0)}); res.StatusCode != 401 || m["error"].(map[string]any)["code"] != "invalid_code" {
		t.Fatalf("replayed code must fail: %d %v", res.StatusCode, m)
	}
	if res, _ := c3.do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, -1)}); res.StatusCode != 401 {
		t.Fatalf("older step must fail: %d", res.StatusCode)
	}
	if res, _ := c3.do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, 1)}); res.StatusCode != 200 {
		t.Fatalf("newer step must pass: %d", res.StatusCode)
	}
}

func TestConcurrentFailuresCapped(t *testing.T) {
	c, _ := newEnv(t)
	loginFull(t, c)
	c2 := c.fresh()
	c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	var wg sync.WaitGroup
	statuses := make(chan int, 20)
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req, _ := http.NewRequest("POST", c2.base+"/api/auth/totp/verify", strings.NewReader(`{"code":"000000"}`))
			req.Header.Set("Content-Type", "application/json")
			res, err := c2.c.Do(req)
			if err != nil {
				t.Error(err)
				return
			}
			res.Body.Close()
			statuses <- res.StatusCode
		}()
	}
	wg.Wait()
	close(statuses)
	counts := map[int]int{}
	for s := range statuses {
		counts[s]++
	}
	if counts[401] > 5 || counts[401]+counts[429] != 20 {
		t.Fatalf("want at most 5x401, rest 429: %v", counts)
	}
}

func TestAccountLimitAcrossIPs(t *testing.T) {
	c, h := newEnv(t)
	secret := loginFull(t, c)
	ctx := context.Background()
	a, _ := AdminByUsername(ctx, h.DB, "admin")
	for i := 0; i < 10; i++ {
		if limited, _ := h.tooManyFailures(ctx, accountKey(a.ID)); limited {
			t.Fatalf("limited after only %d account failures", i)
		}
		if _, err := h.insertFailures(ctx, fmt.Sprintf("10.0.0.%d", i), accountKey(a.ID)); err != nil {
			t.Fatal(err)
		}
	}
	if limited, _ := h.tooManyFailures(ctx, "10.0.0.1"); limited {
		t.Fatal("a single IP failure must not limit that IP")
	}
	if limited, retry := h.tooManyFailures(ctx, accountKey(a.ID)); !limited || retry <= 0 {
		t.Fatal("10 account failures must limit the account")
	}
	c2 := c.fresh()
	if res, _ := c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"}); res.StatusCode != 200 {
		t.Fatalf("password step is per-IP only: %d", res.StatusCode)
	}
	if res, _ := c2.do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, 0)}); res.StatusCode != 429 {
		t.Fatalf("second factor must be account-limited from a clean IP: %d", res.StatusCode)
	}
}

func sidOf(t *testing.T, c *client) string {
	u, _ := url.Parse(c.base)
	for _, ck := range c.c.Jar.Cookies(u) {
		if ck.Name == "sid" {
			return ck.Value
		}
	}
	t.Fatal("no sid cookie")
	return ""
}

func TestOldPasswordCookieInvalidAfterUpgrade(t *testing.T) {
	c, _ := newEnv(t)
	secret := loginFull(t, c)
	c2 := c.fresh()
	c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	old := sidOf(t, c2)
	if res, _ := c2.do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, 0)}); res.StatusCode != 200 {
		t.Fatalf("verify: %d", res.StatusCode)
	}
	if sidOf(t, c2) == old {
		t.Fatal("cookie must rotate on upgrade")
	}
	for _, p := range []string{"/api/auth/me", "/api/auth/totp/setup"} {
		method := "GET"
		if p == "/api/auth/totp/setup" {
			method = "POST"
		}
		req, _ := http.NewRequest(method, c.base+p, nil)
		req.AddCookie(&http.Cookie{Name: "sid", Value: old})
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != 401 {
			t.Fatalf("old token on %s: %d", p, res.StatusCode)
		}
	}
}

func TestStageGates(t *testing.T) {
	c, _ := newEnv(t)
	loginFull(t, c)
	for _, p := range []string{"/api/auth/totp/verify", "/api/auth/recovery"} {
		if res, _ := c.do("POST", p, map[string]string{"code": "000000"}); res.StatusCode != 401 {
			t.Fatalf("full session on %s: %d", p, res.StatusCode)
		}
	}
	c2 := c.fresh()
	c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	for _, rq := range []struct{ method, path string }{
		{"GET", "/api/auth/sessions"}, {"POST", "/api/auth/logout-all"}, {"POST", "/api/auth/recovery-codes/regenerate"},
	} {
		if res, _ := c2.do(rq.method, rq.path, map[string]string{"code": "000000"}); res.StatusCode != 401 {
			t.Fatalf("password stage on %s: %d", rq.path, res.StatusCode)
		}
	}
}

// A password-stage session that vanishes between LoadSession and the upgrade
// (expired or raced) must yield 401, and must not burn a recovery code.
func TestUpgradeOfVanishedSessionIs401(t *testing.T) {
	c, h := newEnv(t)
	secret := loginFull(t, c)
	_, m := c.do("POST", "/api/auth/recovery-codes/regenerate", map[string]string{"code": c.code(secret, 0)})
	codes := m["recoveryCodes"].([]any)
	ctx := context.Background()

	call := func(fn http.HandlerFunc, body string) *httptest.ResponseRecorder {
		c2 := c.fresh()
		c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
		sid := sidOf(t, c2)
		s, err := LookupSession(ctx, h.DB, sid, h.Now())
		if err != nil {
			t.Fatal(err)
		}
		if err := DeleteSession(ctx, h.DB, s.ID); err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest("POST", "/", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), ctxKey{}, current{Session: s, Token: sid}))
		rec := httptest.NewRecorder()
		fn(rec, req)
		return rec
	}
	if rec := call(h.totpVerify, `{"code":"`+c.code(secret, 1)+`"}`); rec.Code != 401 || !strings.Contains(rec.Body.String(), `"unauthorized"`) {
		t.Fatalf("totp verify: %d %s", rec.Code, rec.Body)
	}
	if rec := call(h.recovery, `{"code":"`+codes[0].(string)+`"}`); rec.Code != 401 || !strings.Contains(rec.Body.String(), `"unauthorized"`) {
		t.Fatalf("recovery: %d %s", rec.Code, rec.Body)
	}
	c3 := c.fresh()
	c3.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	if res, _ := c3.do("POST", "/api/auth/recovery", map[string]string{"code": codes[0].(string)}); res.StatusCode != 200 {
		t.Fatalf("recovery code must not be burned by the failed upgrade: %d", res.StatusCode)
	}
}

// reserve holds limitMu only for check-and-pre-charge: while one attempt's
// verification is still running (blocked here), others proceed.
func TestReserveDoesNotSerialiseVerification(t *testing.T) {
	_, h := newEnv(t)
	ctx := context.Background()
	attempt := func(ip string) (*reservation, int) {
		rec := httptest.NewRecorder()
		res, _ := h.reserve(rec, httptest.NewRequest("POST", "/", nil), ip)
		return res, rec.Code
	}
	hold, started := make(chan struct{}), make(chan struct{})
	go func() {
		res, _ := attempt("10.1.1.1")
		close(started)
		<-hold // "verification" in progress
		h.release(ctx, res)
	}()
	<-started
	done := make(chan struct{})
	go func() {
		res, _ := attempt("10.1.1.2")
		h.release(ctx, res)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("second reservation blocked behind an in-flight verification")
	}
	close(hold)

	// Pre-charges count while in flight: 5 unreleased reservations limit the IP.
	for i := 0; i < 5; i++ {
		if _, code := attempt("10.2.2.2"); code != 200 {
			t.Fatalf("reservation %d: %d", i, code)
		}
	}
	if res, code := attempt("10.2.2.2"); res != nil || code != 429 {
		t.Fatalf("6th in-flight reservation must be limited: %d", code)
	}
	// A released (successful) attempt is refunded.
	res, _ := attempt("10.3.3.3")
	h.release(ctx, res)
	if limited, _ := h.tooManyFailures(ctx, "10.3.3.3"); limited {
		t.Fatal("unexpected limit")
	}
	var n int
	_ = h.DB.QueryRow(`SELECT COUNT(*) FROM login_attempts WHERE ip='10.3.3.3'`).Scan(&n)
	if n != 0 {
		t.Fatalf("released reservation must be refunded, %d rows left", n)
	}
}

func TestSuccessfulLoginsAreNotCharged(t *testing.T) {
	c, _ := newEnv(t)
	for i := 0; i < 8; i++ {
		if res, _ := c.fresh().do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"}); res.StatusCode != 200 {
			t.Fatalf("login %d: %d", i, res.StatusCode)
		}
	}
}

// A refund must delete only its own row, even after other rows were cleared
// (plain rowids would be reused and the refund would erase someone else's
// failure).
func TestRefundNeverDeletesAnotherReservationsRow(t *testing.T) {
	_, h := newEnv(t)
	ctx := context.Background()
	reserve := func() *reservation {
		res, ok := h.reserve(httptest.NewRecorder(), httptest.NewRequest("POST", "/", nil), "10.4.4.4")
		if !ok {
			t.Fatal("unexpectedly limited")
		}
		return res
	}
	first := reserve()
	h.clearFailures(ctx, "10.4.4.4") // another request's clear-all
	second := reserve()
	second.keep()
	h.release(ctx, first)
	var n int
	if err := h.DB.QueryRow(`SELECT COUNT(*) FROM login_attempts WHERE rowid=?`, second.rows[0].id).Scan(&n); err != nil || n != 1 {
		t.Fatalf("second reservation's row was deleted by the first refund: n=%d err=%v", n, err)
	}
	if first.rows[0].id == second.rows[0].id {
		t.Fatal("ids must never be reused")
	}
}

// Step-up successes (regenerate) refund their own charge but never wipe the
// key's earlier failures; only reaching the full stage clears history.
func TestStepUpSuccessKeepsEarlierFailures(t *testing.T) {
	c, h := newEnv(t)
	secret := loginFull(t, c)
	if res, _ := c.do("POST", "/api/auth/recovery-codes/regenerate", map[string]string{"code": "000000"}); res.StatusCode != 401 {
		t.Fatalf("bad code: %d", res.StatusCode)
	}
	if res, _ := c.do("POST", "/api/auth/recovery-codes/regenerate", map[string]string{"code": c.code(secret, 0)}); res.StatusCode != 200 {
		t.Fatalf("good code: %d", res.StatusCode)
	}
	a, _ := AdminByUsername(context.Background(), h.DB, "admin")
	var n int
	_ = h.DB.QueryRow(`SELECT COUNT(*) FROM login_attempts WHERE ip=?`, accountKey(a.ID)).Scan(&n)
	if n != 1 {
		t.Fatalf("want exactly the 1 earlier failure on the account key, got %d", n)
	}
}
