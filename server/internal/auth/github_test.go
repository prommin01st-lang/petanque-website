package auth

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/oauth2"

	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func githubEnv(t *testing.T, ghUserID *int64) *client {
	c, _ := githubEnvH(t, ghUserID)
	return c
}

func githubEnvH(t *testing.T, ghUserID *int64) (*client, *Handler) {
	t.Helper()
	gh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/login/oauth/access_token":
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"access_token":"t","token_type":"bearer"}`)
		case "/user":
			fmt.Fprintf(w, `{"id":%d,"login":"octo"}`, *ghUserID)
		}
	}))
	t.Cleanup(gh.Close)
	db := storetest.New(t)
	_ = Bootstrap(context.Background(), db, "admin", "very-long-password")
	cfg := config.Config{PublicURL: "http://example.test", TOTPKey: bytes.Repeat([]byte{1}, 32), SessionSecret: bytes.Repeat([]byte{2}, 32), GitHubClientID: "id", GitHubClientSecret: "s"}
	h := NewHandler(db, cfg)
	h.GitHub.Conf.Endpoint = oauth2.Endpoint{AuthURL: gh.URL + "/login/oauth/authorize", TokenURL: gh.URL + "/login/oauth/access_token"}
	h.GitHub.UserURL = gh.URL + "/user"
	now := frozenClock(h)
	r := chi.NewRouter()
	r.Use(h.LoadSession)
	h.Mount(r)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	jar, _ := cookiejar.New(nil)
	return &client{t: t, base: srv.URL, c: &http.Client{Jar: jar, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, now: now}, h
}

// oauthRoundTrip hits /start then calls /callback with the state GitHub would echo back.
func oauthRoundTrip(t *testing.T, c *client, mode string) *http.Response {
	res, _ := c.do("GET", "/api/auth/github/start?mode="+mode, nil)
	if res.StatusCode != 302 {
		t.Fatalf("start %s: %d", mode, res.StatusCode)
	}
	loc, _ := url.Parse(res.Header.Get("Location"))
	state := loc.Query().Get("state")
	res, _ = c.do("GET", "/api/auth/github/callback?code=abc&state="+url.QueryEscape(state), nil)
	return res
}

// linkRoundTrip performs the step-up POST /link with code, then the callback.
func linkRoundTrip(t *testing.T, c *client, code string) *http.Response {
	t.Helper()
	res, m := c.do("POST", "/api/auth/github/link", map[string]string{"code": code})
	if res.StatusCode != 200 {
		t.Fatalf("link: %d %v", res.StatusCode, m)
	}
	loc, err := url.Parse(m["url"].(string))
	if err != nil {
		t.Fatal(err)
	}
	res, _ = c.do("GET", "/api/auth/github/callback?code=abc&state="+url.QueryEscape(loc.Query().Get("state")), nil)
	return res
}

func TestGitHubLoginRequiresLink(t *testing.T) {
	id := int64(4242)
	c := githubEnv(t, &id)
	res := oauthRoundTrip(t, c, "login")
	if res.StatusCode != 302 || res.Header.Get("Location") != "/admin/login?error=github_not_linked" {
		t.Fatalf("unlinked login: %d %s", res.StatusCode, res.Header.Get("Location"))
	}
	if r, _ := c.do("GET", "/api/auth/me", nil); r.StatusCode != 401 {
		t.Fatal("unlinked github must not create a session")
	}
}

func TestGitHubLinkThenLogin(t *testing.T) {
	id := int64(4242)
	c := githubEnv(t, &id)
	secret := loginFull(t, c)
	res := linkRoundTrip(t, c, c.code(secret, 0))
	if res.Header.Get("Location") != "/admin/settings?linked=1" {
		t.Fatalf("link: %s", res.Header.Get("Location"))
	}
	_, me := c.do("GET", "/api/auth/me", nil)
	if me["githubLogin"] != "octo" {
		t.Fatalf("me: %v", me)
	}
	c.do("POST", "/api/auth/logout", nil)
	c.csrf = ""
	res = oauthRoundTrip(t, c, "login")
	if res.Header.Get("Location") != "/admin" {
		t.Fatalf("linked login: %s", res.Header.Get("Location"))
	}
	_, me = c.do("GET", "/api/auth/me", nil)
	if me["authMethod"] != "github" {
		t.Fatalf("me after github login: %v", me)
	}
	id = 9999 // a different GitHub account
	c.do("POST", "/api/auth/logout", nil)
	if res := oauthRoundTrip(t, c, "login"); res.Header.Get("Location") != "/admin/login?error=github_not_linked" {
		t.Fatal("other github account must be rejected")
	}
}

func TestGitHubBadStateAndLinkNeedsSession(t *testing.T) {
	id := int64(1)
	c := githubEnv(t, &id)
	if res, _ := c.do("GET", "/api/auth/github/callback?code=x&state=forged", nil); res.StatusCode != 302 || res.Header.Get("Location") != "/admin/login?error=github_failed" {
		t.Fatalf("forged state without cookie: %d %s", res.StatusCode, res.Header.Get("Location"))
	}
	if res, _ := c.do("POST", "/api/auth/github/link", map[string]string{"code": "000000"}); res.StatusCode != 401 {
		t.Fatalf("link without session: %d", res.StatusCode)
	}
}

func TestGitHubUnlinkNeedsTOTP(t *testing.T) {
	id := int64(4242)
	c := githubEnv(t, &id)
	secret := loginFull(t, c)
	linkRoundTrip(t, c, c.code(secret, 0))
	if res, _ := c.do("POST", "/api/auth/github/unlink", map[string]string{"code": "000000"}); res.StatusCode != 401 {
		t.Fatalf("bad code: %d", res.StatusCode)
	}
	if _, me := c.do("GET", "/api/auth/me", nil); me["githubLogin"] != "octo" {
		t.Fatalf("must stay linked: %v", me)
	}
	code := c.code(secret, 1)
	if res, _ := c.do("POST", "/api/auth/github/unlink", map[string]string{"code": code}); res.StatusCode != 204 {
		t.Fatalf("unlink: %d", res.StatusCode)
	}
	if _, me := c.do("GET", "/api/auth/me", nil); me["githubLogin"] != nil {
		t.Fatalf("must be unlinked: %v", me)
	}
	if res := oauthRoundTrip(t, c, "login"); res.Header.Get("Location") != "/admin/login?error=github_not_linked" {
		t.Fatal("unlinked account must not log in")
	}
}

func TestGitHubProvidersAndDisabled(t *testing.T) {
	id := int64(1)
	c := githubEnv(t, &id)
	if _, m := c.do("GET", "/api/auth/providers", nil); m["github"] != true {
		t.Fatalf("providers: %v", m)
	}
	c2, _ := newEnv(t)
	if _, m := c2.do("GET", "/api/auth/providers", nil); m["github"] != false {
		t.Fatalf("providers: %v", m)
	}
	res, m := c2.do("GET", "/api/auth/github/start?mode=login", nil)
	if res.StatusCode != 404 || m["error"].(map[string]any)["code"] != "github_disabled" {
		t.Fatalf("disabled: %d %v", res.StatusCode, m)
	}
}

func TestGitHubLinkNeedsTOTPAndStartRejectsLinkMode(t *testing.T) {
	id := int64(4242)
	c, h := githubEnvH(t, &id)
	loginFull(t, c)
	res, m := c.do("POST", "/api/auth/github/link", map[string]string{"code": "000000"})
	if res.StatusCode != 401 || m["error"].(map[string]any)["code"] != "invalid_code" {
		t.Fatalf("bad code: %d %v", res.StatusCode, m)
	}
	for _, ck := range res.Cookies() {
		if ck.Name == stateCookie {
			t.Fatal("no state cookie may be set on a failed step-up")
		}
	}
	var n int
	if err := h.DB.QueryRow(`SELECT COUNT(*) FROM audit_log WHERE action='github.link_failed'`).Scan(&n); err != nil || n != 1 {
		t.Fatalf("link_failed audit: %d %v", n, err)
	}
	if res, _ := c.do("GET", "/api/auth/github/start?mode=link", nil); res.StatusCode != 422 {
		t.Fatalf("start mode=link: %d", res.StatusCode)
	}
	if _, me := c.do("GET", "/api/auth/me", nil); me["githubLogin"] != nil {
		t.Fatalf("must not be linked: %v", me)
	}
}

func setState(t *testing.T, c *client, value string) {
	u, _ := url.Parse(c.base)
	c.c.Jar.SetCookies(u, []*http.Cookie{{Name: stateCookie, Value: value, Path: "/api/auth/github"}})
}

func TestGitHubCallbackStateValidation(t *testing.T) {
	id := int64(4242)
	c, h := githubEnvH(t, &id)
	const loginFail = "/admin/login?error=github_failed"
	cb := func(state string) string {
		res, _ := c.do("GET", "/api/auth/github/callback?code=abc&state="+url.QueryEscape(state), nil)
		if res.StatusCode != 302 {
			t.Fatalf("callback with bad state must redirect, got %d", res.StatusCode)
		}
		return res.Header.Get("Location")
	}
	setState(t, c, h.stateValue("s1", modeLogin, 0, h.Now().Add(-time.Minute)))
	if got := cb("s1"); got != loginFail {
		t.Fatalf("expired state: %s", got)
	}
	good := h.stateValue("s2", modeLogin, 0, h.Now().Add(time.Minute))
	setState(t, c, good[:len(good)-1]+map[bool]string{true: "0", false: "1"}[good[len(good)-1] != '0'])
	if got := cb("s2"); got != loginFail {
		t.Fatalf("tampered signature: %s", got)
	}
	setState(t, c, good)
	if got := cb("other"); got != loginFail {
		t.Fatalf("state mismatch: %s", got)
	}
	setState(t, c, h.stateValue("s3", modeLink, 1, h.Now().Add(time.Minute)))
	if got := cb("other"); got != "/admin/settings?error=github_failed" {
		t.Fatalf("link state mismatch: %s", got)
	}
	if _, me := c.do("GET", "/api/auth/me", nil); me["githubLogin"] != nil {
		t.Fatalf("must not be linked: %v", me)
	}
}

func TestGitHubLinkCallbackSessionMustMatchState(t *testing.T) {
	id := int64(4242)
	c, h := githubEnvH(t, &id)
	loginFull(t, c)
	setState(t, c, h.stateValue("s", modeLink, 999, h.Now().Add(time.Minute)))
	res, _ := c.do("GET", "/api/auth/github/callback?code=abc&state=s", nil)
	if res.StatusCode != 401 {
		t.Fatalf("foreign admin state: %d", res.StatusCode)
	}
	if _, me := c.do("GET", "/api/auth/me", nil); me["githubLogin"] != nil {
		t.Fatalf("must not be linked: %v", me)
	}
}

func TestGitHubLinkConflict(t *testing.T) {
	id := int64(4242)
	c, h := githubEnvH(t, &id)
	secret := loginFull(t, c)
	if _, err := h.DB.Exec(`INSERT INTO admins(username,password_hash,github_id,github_login) VALUES('other','x',4242,'octo')`); err != nil {
		t.Fatal(err)
	}
	res := linkRoundTrip(t, c, c.code(secret, 0))
	if res.Header.Get("Location") != "/admin/settings?error=github_in_use" {
		t.Fatalf("conflict: %d %s", res.StatusCode, res.Header.Get("Location"))
	}
	var n int
	_ = h.DB.QueryRow(`SELECT COUNT(*) FROM audit_log WHERE action='github.link_conflict'`).Scan(&n)
	if n != 1 {
		t.Fatalf("link_conflict audit: %d", n)
	}
}
