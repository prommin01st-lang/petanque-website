// Package testutil provides an authenticated HTTP test client for handler tests.
package testutil

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/pquerna/otp/totp"

	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

const (
	adminUser = "admin"
	adminPass = "very-long-password"
)

// Client is a cookie-keeping HTTP client bound to a test server.
type Client struct {
	t    *testing.T
	Base string
	c    *http.Client
	csrf string
	ah   *auth.Handler
}

// NewServer starts a server with auth mounted plus whatever mount adds, backed
// by a fresh database containing one admin ("admin"/"very-long-password").
func NewServer(t *testing.T, mount func(r chi.Router, ah *auth.Handler)) (*Client, *sql.DB) {
	t.Helper()
	auth.BcryptCost = 4
	db := storetest.New(t)
	if err := auth.Bootstrap(t.Context(), db, adminUser, adminPass); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{PublicURL: "http://example.test", TOTPKey: bytes.Repeat([]byte{1}, 32), SessionSecret: bytes.Repeat([]byte{2}, 32)}
	ah := auth.NewHandler(db, cfg)
	t0 := time.Now()
	ah.Now = func() time.Time { return t0 }
	r := chi.NewRouter()
	r.Use(ah.LoadSession)
	ah.Mount(r)
	mount(r, ah)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	jar, _ := cookiejar.New(nil)
	return &Client{t: t, Base: srv.URL, c: &http.Client{Jar: jar}, ah: ah}, db
}

// Do sends body as JSON (nil for none) and decodes the JSON response, if any.
func (c *Client) Do(method, path string, body any) (*http.Response, map[string]any) {
	c.t.Helper()
	var rd io.Reader
	ct := ""
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			c.t.Fatal(err)
		}
		rd, ct = bytes.NewReader(b), "application/json"
	}
	return c.DoRaw(method, path, ct, rd)
}

// DoRaw sends an arbitrary body with the given Content-Type (may be empty).
func (c *Client) DoRaw(method, path, contentType string, body io.Reader) (*http.Response, map[string]any) {
	c.t.Helper()
	req, err := http.NewRequest(method, c.Base+path, body)
	if err != nil {
		c.t.Fatal(err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
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

// LoginFull performs password + TOTP enrolment and returns the TOTP secret.
// Afterwards the client sends the CSRF token on every request.
func (c *Client) LoginFull() string {
	c.t.Helper()
	res, m := c.Do("POST", "/api/auth/login", map[string]string{"username": adminUser, "password": adminPass})
	if res.StatusCode != 200 || m["next"] != "totp_setup" {
		c.t.Fatalf("login: %d %v", res.StatusCode, m)
	}
	_, m = c.Do("POST", "/api/auth/totp/setup", nil)
	secret, _ := m["secret"].(string)
	code, err := totp.GenerateCode(secret, c.ah.Now())
	if err != nil {
		c.t.Fatal(err)
	}
	if res, m = c.Do("POST", "/api/auth/totp/verify", map[string]string{"code": code}); res.StatusCode != 200 {
		c.t.Fatalf("verify: %d %v", res.StatusCode, m)
	}
	_, me := c.Do("GET", "/api/auth/me", nil)
	c.csrf, _ = me["csrfToken"].(string)
	return secret
}
