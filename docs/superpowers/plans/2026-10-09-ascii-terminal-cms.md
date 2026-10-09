# ASCII Terminal Portfolio + Admin CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the React 3D portfolio into an ASCII-art terminal site backed by a self-hosted Go + SQLite API with a password+TOTP (and linked-GitHub) Admin Console for projects and a bilingual Markdown blog, shipped as one Docker image behind Caddy.

**Architecture:** One Go binary (`server/`) serves `/api/*`, `/uploads/*`, `rss.xml`, `sitemap.xml` and the embedded Vite build with per-route meta injection. The React app (`app/`) switches to `BrowserRouter`, reads content through a typed API client + TanStack Query, lazy-loads an `/admin` console, and renders the existing three.js scene through a custom GPU ASCII post-process with a noise background and cursor "scramble" + fading drag trail.

**Tech Stack:** Go 1.27, chi v5, modernc.org/sqlite, pquerna/otp, x/crypto/bcrypt, x/oauth2, x/image/webp · React 19, Vite 7, TypeScript 5.9, Tailwind 3, @tanstack/react-query, react-markdown + remark-gfm + rehype-sanitize + rehype-highlight, qrcode, @dnd-kit, Vitest + RTL, Playwright · Docker (distroless), Caddy 2, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-09-ascii-terminal-cms-design.md` — read it before starting any task; this plan argues from it.

## Global Constraints

- Go module path: `github.com/prommin01st-lang/petanque-website/server`; Go toolchain at `~/tools/go/bin` (export `PATH=$HOME/tools/go/bin:$PATH` in every shell).
- SQLite driver name `"sqlite"` (`modernc.org/sqlite`), `CGO_ENABLED=0` must build.
- All JSON is **camelCase**. Every error body: `{"error":{"code":"snake_case","message":"…"}}`; validation adds `"fields":{"camelField":"msg"}` with status 422 code `validation_failed`.
- Timestamps: RFC 3339 UTC strings, produced by `store.Now()` (`time.Now().UTC().Format(time.RFC3339Nano)`)-style helper.
- Slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 80 chars. Tags ≤ 12, each ≤ 32 chars. URL fields empty or `http://`/`https://`.
- JSON bodies ≤ 1 MB, `Content-Type: application/json` required on JSON endpoints (415 `unsupported_media_type`). Uploads ≤ 5 MB, png/jpeg/webp/gif only.
- Session cookie `sid`: `HttpOnly; SameSite=Strict; Path=/; Secure` unless `COOKIE_SECURE=false`. Password-stage TTL 10 min, full TTL 7 days. DB stores sha256 hex of the token.
- Rate limit: 5 failures / IP / 15 min on login, totp/verify, recovery → 429 `rate_limited` + `Retry-After`.
- bcrypt cost 12 (tests may use `bcrypt.MinCost` via a package var). `ADMIN_PASSWORD` ≥ 12 chars.
- Frontend: all UI copy in `app/src/i18n/translations.ts` under **both** `en` and `th`; `import type` for types (`verbatimModuleSyntax`); no unused locals; R3F code must not call `Math.random()` during render or write refs during render (see AGENTS.md sandbox notes).
- Keep the pointer-events contract: section wrappers `pointer-events-none`, content panels `pointer-events-auto`.
- Palette: `bg #05080D`, `surface #0B1118`, `text #D7E3F0`, `text-dim #6B7A90`, `neon-cyan #00E5FF`, `terminal-green #4AF626`, `hud-purple #6C5CE7`, `gold #FFD93D`, `hud-border #1E2A38`.
- Commit after each task with a conventional message ending in `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never commit `.agents/`, `.claude/`, `skills-lock.json`, `app/dist`, `server/internal/web/dist/*` (except `.keep`), `*.db`.
- Verification commands: `cd server && go vet ./... && go test ./...`; `cd app && npm run lint && npm test -- --run && npm run build`. Lint baseline: 9 pre-existing errors in `src/components/ui/*`, `src/i18n/I18nContext.tsx` — no new errors allowed.

## Review Focus

1. **Thai-only/empty TH content** — a project or post with empty `*Th` fields viewed in TH must show the EN text, never blank (tested in Task 7/9 `pick` + Task 13 `pick`).
2. **Draft leakage** — a draft post must be invisible on `/api/posts`, `/api/posts/{slug}`, `rss.xml`, `sitemap.xml` and must not get post-specific meta on `/blog/{slug}` (tests in Tasks 9 and 10).
3. **Half-logged-in session** — a session that passed the password but not TOTP must be rejected (401) by every `/api/admin/*` route and by `/api/auth/me` (Task 5 test).
4. **Malicious content** — `<script>` in Markdown or in a title must not execute in the public page, the admin preview, or injected meta tags (Task 10 escaping test, Task 16 sanitize test).
5. **Lost work in the editor** — reloading or navigating away from a dirty post editor must offer to restore the autosaved draft (Task 17 test).

---

## File Map

```
server/
  go.mod, go.sum
  cmd/server/main.go                 serve | healthcheck | backup <dest>
  internal/config/config.go(+_test)  Load(getenv) (Config, error)
  internal/httpx/httpx.go(+_test)    Error, Fail, WriteJSON, DecodeJSON, ClientIP, SecurityHeaders
  internal/store/store.go(+_test)    Open, Migrate, Now, Backup
  internal/store/migrations/0001_init.sql
  internal/store/storetest/storetest.go  New(t) *sql.DB
  internal/seed/projects.json, seed.go(+_test)
  internal/audit/audit.go(+_test)    Log, Handler
  internal/auth/{crypto,sessions,service,handlers,middleware,ratelimit,github}.go (+tests)
  internal/projects/{model,repo,handlers}.go (+tests)
  internal/posts/{model,repo,handlers}.go (+tests)
  internal/media/{media,handlers}.go (+tests)
  internal/web/{web,meta,feeds}.go (+tests), dist/.keep
  internal/app/app.go(+_test)        New(deps) http.Handler — wires everything
Dockerfile, .dockerignore
deploy/{docker-compose.yml,Caddyfile,.env.example,backup.sh,README.md}
.github/workflows/ci.yml
app/
  vite.config.ts, vitest.config.ts, index.html, package.json
  src/test/setup.ts
  src/lib/{api.ts,types.ts,pick.ts,queryClient.ts}(+tests)
  src/components/term/{AsciiBox,Prompt,AsciiDivider,FigletTitle,Cursor,LoadingBar,ErrorLine}.tsx
  src/components/Markdown.tsx(+test)
  src/pages/{HomePage,BlogListPage,BlogPostPage,NotFoundPage}.tsx
  src/sections/LatestPostsSection.tsx (+ redesigned existing sections)
  src/admin/AdminApp.tsx, AuthGate.tsx, useMe.ts, AdminLayout.tsx, CommandPalette.tsx
  src/admin/login/LoginPage.tsx(+test), TotpSetup.tsx, RecoveryCodes.tsx
  src/admin/projects/{ProjectsPage,ProjectEditor}.tsx
  src/admin/posts/{PostsPage,PostEditor,useAutosave}.tsx(+test)
  src/admin/media/MediaPage.tsx, src/admin/settings/SettingsPage.tsx, src/admin/audit/AuditPage.tsx
  src/admin/components/{Field,LangTabs,TagsInput,ConfirmDelete}.tsx
  src/sandbox/ascii/{asciiMath.ts(+test),glyphAtlas.ts,asciiShader.ts,trail.ts,AsciiEffect.tsx,StaticAsciiBackdrop.tsx,usePointerField.ts}
e2e/ (Playwright at repo root: playwright.config.ts, e2e/admin-blog.spec.ts, package.json)
```

---

## Phase 1 — Go backend

### Task 1: Go module, config, httpx, app skeleton with /healthz

**Files:**
- Create: `server/go.mod`, `server/cmd/server/main.go`, `server/internal/config/config.go`, `server/internal/config/config_test.go`, `server/internal/httpx/httpx.go`, `server/internal/httpx/httpx_test.go`, `server/internal/app/app.go`, `server/internal/app/app_test.go`
- Modify: `.gitignore` (add `*.db`, `*.db-wal`, `*.db-shm`, `server/internal/web/dist/*`, `!server/internal/web/dist/.keep`, `server/server`)

**Interfaces:**
- Produces:
  - `config.Config{Addr, PublicURL, DataDir, AdminUsername, AdminPassword string; SessionSecret, TOTPKey []byte; GitHubClientID, GitHubClientSecret string; CookieSecure bool; TrustedProxy *net.IPNet}`; `func (c Config) GitHubEnabled() bool`; `func Load(getenv func(string) string) (Config, error)`.
  - `httpx.Error{Status int; Code, Message string; Fields map[string]string}` (implements `error`); `httpx.NewError(status int, code, msg string) *Error`; `httpx.Validation(fields map[string]string) *Error`; `httpx.Fail(w http.ResponseWriter, err error)` (writes `*Error` or logs + 500 `internal`); `httpx.WriteJSON(w, status int, v any)`; `httpx.DecodeJSON(r *http.Request, dst any) error` (415/400/413 as `*Error`); `httpx.ClientIP(r *http.Request, trusted *net.IPNet) string`; `httpx.SecurityHeaders(next http.Handler) http.Handler`.
  - `app.Deps{Cfg config.Config; DB *sql.DB; Dist fs.FS}`; `app.New(d Deps) http.Handler` (chi router). Later tasks add their `Mount` calls inside `New`.

- [ ] **Step 1: Init module and deps**

```bash
export PATH=$HOME/tools/go/bin:$PATH
mkdir -p server && cd server
go mod init github.com/prommin01st-lang/petanque-website/server
go get github.com/go-chi/chi/v5@latest
```

- [ ] **Step 2: Write failing tests**

`server/internal/config/config_test.go`:

```go
package config

import (
	"encoding/base64"
	"strings"
	"testing"
)

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

func base() map[string]string {
	return map[string]string{
		"PUBLIC_URL":     "https://example.com",
		"SESSION_SECRET": strings.Repeat("s", 32),
		"TOTP_ENC_KEY":   base64.StdEncoding.EncodeToString([]byte(strings.Repeat("k", 32))),
	}
}

func TestLoadDefaults(t *testing.T) {
	c, err := Load(env(base()))
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":8080" || c.DataDir != "/data" || !c.CookieSecure || c.GitHubEnabled() {
		t.Fatalf("bad defaults: %+v", c)
	}
	if len(c.TOTPKey) != 32 || c.TrustedProxy == nil || c.TrustedProxy.String() != "172.16.0.0/12" {
		t.Fatalf("bad key/proxy: %+v", c)
	}
}

func TestLoadErrors(t *testing.T) {
	cases := map[string]func(m map[string]string){
		"missing public url": func(m map[string]string) { delete(m, "PUBLIC_URL") },
		"short secret":       func(m map[string]string) { m["SESSION_SECRET"] = "short" },
		"bad totp key":       func(m map[string]string) { m["TOTP_ENC_KEY"] = "not-base64!!" },
		"short totp key":     func(m map[string]string) { m["TOTP_ENC_KEY"] = base64.StdEncoding.EncodeToString([]byte("x")) },
		"half github":        func(m map[string]string) { m["GITHUB_CLIENT_ID"] = "id" },
		"bad cidr":           func(m map[string]string) { m["TRUSTED_PROXY_CIDR"] = "nope" },
	}
	for name, mut := range cases {
		t.Run(name, func(t *testing.T) {
			m := base()
			mut(m)
			if _, err := Load(env(m)); err == nil {
				t.Fatal("expected error")
			}
		})
	}
}

func TestCookieSecureFalseAndGitHub(t *testing.T) {
	m := base()
	m["COOKIE_SECURE"] = "false"
	m["GITHUB_CLIENT_ID"], m["GITHUB_CLIENT_SECRET"] = "id", "secret"
	c, err := Load(env(m))
	if err != nil || c.CookieSecure || !c.GitHubEnabled() {
		t.Fatalf("got %+v %v", c, err)
	}
}
```

`server/internal/httpx/httpx_test.go`:

```go
package httpx

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFailWritesEnvelope(t *testing.T) {
	rec := httptest.NewRecorder()
	Fail(rec, Validation(map[string]string{"slug": "required"}))
	if rec.Code != 422 {
		t.Fatalf("status %d", rec.Code)
	}
	var body struct {
		Error struct {
			Code   string            `json:"code"`
			Fields map[string]string `json:"fields"`
		} `json:"error"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error.Code != "validation_failed" || body.Error.Fields["slug"] != "required" {
		t.Fatalf("body %s", rec.Body)
	}
}

func TestFailUnknownErrorIs500(t *testing.T) {
	rec := httptest.NewRecorder()
	Fail(rec, errors.New("boom"))
	if rec.Code != 500 || !strings.Contains(rec.Body.String(), `"internal"`) || strings.Contains(rec.Body.String(), "boom") {
		t.Fatalf("got %d %s", rec.Code, rec.Body)
	}
}

func TestDecodeJSON(t *testing.T) {
	var v struct{ A int }
	r := httptest.NewRequest("POST", "/", strings.NewReader(`{"A":1}`))
	if err := DecodeJSON(r, &v); err == nil {
		t.Fatal("missing content-type must fail")
	} else if e := err.(*Error); e.Status != 415 {
		t.Fatalf("status %d", e.Status)
	}
	r = httptest.NewRequest("POST", "/", strings.NewReader(`{"A":1,"B":2}`))
	r.Header.Set("Content-Type", "application/json; charset=utf-8")
	if err := DecodeJSON(r, &v); err == nil || err.(*Error).Status != 400 {
		t.Fatalf("unknown field must 400, got %v", err)
	}
	r = httptest.NewRequest("POST", "/", strings.NewReader(`{"A":1}`))
	r.Header.Set("Content-Type", "application/json")
	if err := DecodeJSON(r, &v); err != nil || v.A != 1 {
		t.Fatalf("got %v %v", v, err)
	}
	big := `{"A":1,"pad":"` + strings.Repeat("x", 1<<20) + `"}`
	r = httptest.NewRequest("POST", "/", strings.NewReader(big))
	r.Header.Set("Content-Type", "application/json")
	if err := DecodeJSON(r, &v); err == nil || err.(*Error).Status != 413 {
		t.Fatalf("oversize must 413, got %v", err)
	}
}

func TestClientIP(t *testing.T) {
	_, trusted, _ := net.ParseCIDR("172.16.0.0/12")
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "172.18.0.5:1234"
	r.Header.Set("X-Forwarded-For", "203.0.113.9, 172.18.0.1")
	if ip := ClientIP(r, trusted); ip != "203.0.113.9" {
		t.Fatalf("trusted proxy: %s", ip)
	}
	r.RemoteAddr = "198.51.100.7:1"
	if ip := ClientIP(r, trusted); ip != "198.51.100.7" {
		t.Fatalf("untrusted proxy must ignore XFF: %s", ip)
	}
}

func TestSecurityHeaders(t *testing.T) {
	h := SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	for _, k := range []string{"X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Content-Security-Policy"} {
		if rec.Header().Get(k) == "" {
			t.Fatalf("missing %s", k)
		}
	}
}
```

`server/internal/app/app_test.go`:

```go
package app

import (
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func testDeps(t *testing.T) Deps {
	return Deps{Cfg: config.Config{PublicURL: "http://x"}, DB: storetest.New(t), Dist: fstest.MapFS{"index.html": {Data: []byte("<html><head><!--app-meta--></head></html>")}}}
}

func TestHealthz(t *testing.T) {
	h := New(testDeps(t))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/healthz", nil))
	if rec.Code != 200 || rec.Body.String() != "{\"ok\":true}\n" {
		t.Fatalf("got %d %q", rec.Code, rec.Body)
	}
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("security headers not applied")
	}
}
```

> Note: `storetest` is created in Task 2. For Task 1, create a minimal `server/internal/store/storetest/storetest.go` that opens `sql.Open("sqlite", "file:"+t.Name()+"?mode=memory&cache=shared")` (add `go get modernc.org/sqlite`) — Task 2 replaces its body with the migrated version.

- [ ] **Step 3: Run to verify failure**

Run: `cd server && go test ./...` → FAIL (undefined: Load, Fail, New …).

- [ ] **Step 4: Implement**

`server/internal/config/config.go`:

```go
// Package config loads and validates runtime configuration from the environment.
package config

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"strings"
)

type Config struct {
	Addr               string
	PublicURL          string
	DataDir            string
	AdminUsername      string
	AdminPassword      string
	SessionSecret      []byte
	TOTPKey            []byte
	GitHubClientID     string
	GitHubClientSecret string
	CookieSecure       bool
	TrustedProxy       *net.IPNet
}

func (c Config) GitHubEnabled() bool { return c.GitHubClientID != "" && c.GitHubClientSecret != "" }

func Load(getenv func(string) string) (Config, error) {
	get := func(k, def string) string {
		if v := strings.TrimSpace(getenv(k)); v != "" {
			return v
		}
		return def
	}
	c := Config{
		Addr:               get("ADDR", ":8080"),
		PublicURL:          strings.TrimRight(get("PUBLIC_URL", ""), "/"),
		DataDir:            get("DATA_DIR", "/data"),
		AdminUsername:      get("ADMIN_USERNAME", ""),
		AdminPassword:      getenv("ADMIN_PASSWORD"),
		GitHubClientID:     get("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: get("GITHUB_CLIENT_SECRET", ""),
		CookieSecure:       get("COOKIE_SECURE", "true") != "false",
	}
	var errs []error
	if !strings.HasPrefix(c.PublicURL, "http://") && !strings.HasPrefix(c.PublicURL, "https://") {
		errs = append(errs, errors.New("PUBLIC_URL must be an http(s) URL"))
	}
	c.SessionSecret = []byte(getenv("SESSION_SECRET"))
	if len(c.SessionSecret) < 32 {
		errs = append(errs, errors.New("SESSION_SECRET must be at least 32 bytes"))
	}
	key, err := base64.StdEncoding.DecodeString(get("TOTP_ENC_KEY", ""))
	if err != nil || len(key) != 32 {
		errs = append(errs, errors.New("TOTP_ENC_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)"))
	}
	c.TOTPKey = key
	if (c.GitHubClientID == "") != (c.GitHubClientSecret == "") {
		errs = append(errs, errors.New("set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or neither"))
	}
	_, cidr, err := net.ParseCIDR(get("TRUSTED_PROXY_CIDR", "172.16.0.0/12"))
	if err != nil {
		errs = append(errs, fmt.Errorf("TRUSTED_PROXY_CIDR: %w", err))
	}
	c.TrustedProxy = cidr
	return c, errors.Join(errs...)
}
```

`server/internal/httpx/httpx.go`:

```go
// Package httpx holds JSON/HTTP helpers shared by all handlers.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"strings"
)

const maxJSONBody = 1 << 20

type Error struct {
	Status  int               `json:"-"`
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

func NewError(status int, code, msg string) *Error { return &Error{Status: status, Code: code, Message: msg} }

func Validation(fields map[string]string) *Error {
	return &Error{Status: http.StatusUnprocessableEntity, Code: "validation_failed", Message: "Some fields are invalid.", Fields: fields}
}

var (
	ErrNotFound     = NewError(http.StatusNotFound, "not_found", "Resource not found.")
	ErrUnauthorized = NewError(http.StatusUnauthorized, "unauthorized", "Login required.")
)

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func Fail(w http.ResponseWriter, err error) {
	var e *Error
	if !errors.As(err, &e) {
		slog.Error("internal error", "err", err)
		e = NewError(http.StatusInternalServerError, "internal", "Something went wrong.")
	}
	WriteJSON(w, e.Status, map[string]*Error{"error": e})
}

func DecodeJSON(r *http.Request, dst any) error {
	mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if mt != "application/json" {
		return NewError(http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json.")
	}
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, maxJSONBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			return NewError(http.StatusRequestEntityTooLarge, "too_large", "Request body too large.")
		}
		return NewError(http.StatusBadRequest, "bad_json", "Malformed JSON body.")
	}
	return nil
}

func ClientIP(r *http.Request, trusted *net.IPNet) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	if ip := net.ParseIP(host); ip != nil && trusted != nil && trusted.Contains(ip) {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			return strings.TrimSpace(strings.Split(xff, ",")[0])
		}
	}
	return host
}

const csp = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
	"font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Content-Security-Policy", csp)
		next.ServeHTTP(w, r)
	})
}
```

`server/internal/app/app.go`:

```go
// Package app assembles the HTTP handler from all feature packages.
package app

import (
	"database/sql"
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
)

type Deps struct {
	Cfg  config.Config
	DB   *sql.DB
	Dist fs.FS
}

func New(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer, httpx.SecurityHeaders)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := d.DB.PingContext(r.Context()); err != nil {
			httpx.Fail(w, err)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})
	return r
}
```

`server/cmd/server/main.go` (Task 2 adds DB open/migrate, Task 10 adds web dist, Task 11 adds subcommands):

```go
package main

import (
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/app"
	"github.com/prommin01st-lang/petanque-website/server/internal/config"
)

func main() {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		slog.Error("invalid configuration", "err", err)
		os.Exit(1)
	}
	srv := &http.Server{Addr: cfg.Addr, Handler: app.New(app.Deps{Cfg: cfg}), ReadHeaderTimeout: 10 * time.Second}
	slog.Info("listening", "addr", cfg.Addr)
	if err := srv.ListenAndServe(); err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}
```

- [ ] **Step 5: Run tests** — `cd server && go mod tidy && go vet ./... && go test ./...` → PASS.
- [ ] **Step 6: Commit** — `git add server .gitignore && git commit -m "feat(server): go module skeleton with config, httpx and healthz"`.

---

### Task 2: SQLite store, migrations, test helper

**Files:**
- Create: `server/internal/store/store.go`, `server/internal/store/store_test.go`, `server/internal/store/migrations/0001_init.sql`
- Modify: `server/internal/store/storetest/storetest.go`, `server/cmd/server/main.go`

**Interfaces:**
- Consumes: `config.Config.DataDir`.
- Produces: `store.Open(path string) (*sql.DB, error)` (pragmas `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`; `SetMaxOpenConns(1)`); `store.Migrate(db *sql.DB) error`; `store.Now() string`; `store.Backup(ctx, db, dest string) error` (`VACUUM INTO`); `storetest.New(t testing.TB) *sql.DB` (fresh in-memory migrated DB, closed on cleanup); `store.IsUniqueViolation(err error) bool`.

- [ ] **Step 1: Write failing test** `server/internal/store/store_test.go`:

```go
package store

import (
	"context"
	"path/filepath"
	"testing"
)

func TestOpenMigrateIdempotent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "app.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	for i := 0; i < 2; i++ {
		if err := Migrate(db); err != nil {
			t.Fatalf("migrate #%d: %v", i, err)
		}
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&n); err != nil || n != 1 {
		t.Fatalf("migrations recorded = %d, %v", n, err)
	}
	var fk int
	_ = db.QueryRow(`PRAGMA foreign_keys`).Scan(&fk)
	if fk != 1 {
		t.Fatal("foreign keys off")
	}
	for _, tbl := range []string{"admins", "recovery_codes", "sessions", "projects", "media", "posts", "audit_log", "login_attempts"} {
		if _, err := db.Exec("SELECT 1 FROM " + tbl + " LIMIT 1"); err != nil {
			t.Fatalf("table %s: %v", tbl, err)
		}
	}
}

func TestUniqueViolationAndBackup(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "a.db"))
	defer db.Close()
	_ = Migrate(db)
	ins := `INSERT INTO projects(slug,name_en,desc_en,created_at,updated_at) VALUES('x','X','d',?,?)`
	if _, err := db.Exec(ins, Now(), Now()); err != nil {
		t.Fatal(err)
	}
	_, err := db.Exec(ins, Now(), Now())
	if !IsUniqueViolation(err) {
		t.Fatalf("want unique violation, got %v", err)
	}
	dest := filepath.Join(dir, "backup.db")
	if err := Backup(context.Background(), db, dest); err != nil {
		t.Fatal(err)
	}
	b, _ := Open(dest)
	defer b.Close()
	var n int
	_ = b.QueryRow(`SELECT COUNT(*) FROM projects`).Scan(&n)
	if n != 1 {
		t.Fatalf("backup rows %d", n)
	}
}
```

- [ ] **Step 2: Run** `go test ./internal/store/` → FAIL.
- [ ] **Step 3: Implement.** `migrations/0001_init.sql` = the exact schema in spec §3.3 (all `CREATE TABLE` + two indexes). `store.go`:

```go
// Package store opens the SQLite database and applies embedded migrations.
package store

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrations embed.FS

func Open(path string) (*sql.DB, error) {
	dsn := "file:" + path + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func Now() string { return time.Now().UTC().Format(time.RFC3339Nano) }

func Migrate(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`); err != nil {
		return err
	}
	names, err := fs.Glob(migrations, "migrations/*.sql")
	if err != nil {
		return err
	}
	sort.Strings(names)
	for _, name := range names {
		version := strings.TrimSuffix(strings.TrimPrefix(name, "migrations/"), ".sql")
		var exists int
		if err := db.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, version).Scan(&exists); err != nil {
			return err
		}
		if exists > 0 {
			continue
		}
		body, err := migrations.ReadFile(name)
		if err != nil {
			return err
		}
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(string(body)); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %s: %w", version, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)`, version, Now()); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

func IsUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}

func Backup(ctx context.Context, db *sql.DB, dest string) error {
	_, err := db.ExecContext(ctx, `VACUUM INTO ?`, dest)
	return err
}
```

`storetest/storetest.go`:

```go
// Package storetest provides fresh migrated in-memory databases for tests.
package storetest

import (
	"database/sql"
	"fmt"
	"sync/atomic"
	"testing"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

var n atomic.Int64

func New(t testing.TB) *sql.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:mem%d?mode=memory&cache=shared&_pragma=foreign_keys(1)", n.Add(1))
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatal(err)
	}
	db.SetMaxOpenConns(1)
	if err := store.Migrate(db); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}
```

`main.go`: after config load, `os.MkdirAll(cfg.DataDir+"/uploads", 0o750)`, `db, err := store.Open(filepath.Join(cfg.DataDir, "app.db"))`, `store.Migrate(db)`, pass `DB: db` to `app.Deps`. Exit 1 with `slog.Error` on any failure.

- [ ] **Step 4: Run** `go test ./...` → PASS.
- [ ] **Step 5: Commit** — `feat(server): sqlite store with embedded migrations`.

---

### Task 3: Seed the 11 existing projects

**Files:**
- Create: `server/internal/seed/projects.json`, `server/internal/seed/seed.go`, `server/internal/seed/seed_test.go`
- Modify: `server/cmd/server/main.go` (call `seed.Projects(ctx, db)` after migrate)

**Interfaces:**
- Produces: `seed.Projects(ctx context.Context, db *sql.DB) (inserted int, err error)` — inserts only when `projects` is empty.

- [ ] **Step 1: Build `projects.json`.** Array of objects with keys `slug, nameEn, nameTh, descEn, descTh, tags, metric, repoUrl, demoUrl, flagship`, in the current display order (`sort_order` = array index). Copy **verbatim**: EN/TH `name`/`description` from `app/src/i18n/translations.ts` (`translations.en.projects.items.<key>` / `translations.th.projects.items.<key>`), and `tags`, `metric`, `flagship`, repo URL from the `projects` array in `app/src/sections/ProjectsSection.tsx` (read the whole file — repo links may live in a separate map). Slugs = the `id` values: kanban, domain-viewer, queue-backend, realtime-chat, contextgate, context-nexus, mcp-control-tower, automation-scripts, iron-coach-th, sarabun-ocr, flow-forge. `demoUrl` = `""` unless the source has one.

- [ ] **Step 2: Failing test** `seed_test.go`:

```go
package seed

import (
	"context"
	"testing"

	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func TestProjectsSeedOnce(t *testing.T) {
	db := storetest.New(t)
	n, err := Projects(context.Background(), db)
	if err != nil || n != 11 {
		t.Fatalf("first seed: %d %v", n, err)
	}
	n, err = Projects(context.Background(), db)
	if err != nil || n != 0 {
		t.Fatalf("second seed must be a no-op: %d %v", n, err)
	}
	var slug, nameTh string
	var flagship int
	_ = db.QueryRow(`SELECT slug, name_th, flagship FROM projects ORDER BY sort_order LIMIT 1`).Scan(&slug, &nameTh, &flagship)
	if slug != "kanban" || nameTh == "" || flagship != 1 {
		t.Fatalf("first row: %s %q %d", slug, nameTh, flagship)
	}
}
```

- [ ] **Step 3: Implement** `seed.go`: `//go:embed projects.json`, unmarshal into a struct slice, in one transaction check `SELECT COUNT(*) FROM projects`, if 0 insert each with `tags` marshalled to JSON, `sort_order = i`, `published = 1`, timestamps `store.Now()`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(server): seed existing portfolio projects`.

---

### Task 4: Auth primitives — crypto, admin bootstrap, sessions, recovery codes

**Files:**
- Create: `server/internal/auth/crypto.go`, `server/internal/auth/crypto_test.go`, `server/internal/auth/sessions.go`, `server/internal/auth/sessions_test.go`, `server/internal/auth/admin.go`, `server/internal/auth/admin_test.go`
- Modify: `server/cmd/server/main.go` (call `auth.Bootstrap`)

**Interfaces:**
- Produces:
  - `auth.BcryptCost` (package var, default 12).
  - `auth.HashPassword(pw string) (string, error)`, `auth.CheckPassword(hash, pw string) bool`.
  - `auth.Encrypt(key, plaintext []byte) ([]byte, error)`, `auth.Decrypt(key, blob []byte) ([]byte, error)` (AES-256-GCM, nonce prefix).
  - `auth.RandomToken(n int) string` (base64url, no padding), `auth.SHA256Hex(s string) string`.
  - `auth.NewRecoveryCodes() (plain []string, hashes []string)` — 8 codes `xxxx-xxxx` from alphabet `abcdefghjkmnpqrstuvwxyz23456789`.
  - `auth.Bootstrap(ctx, db *sql.DB, username, password string) error` — no-op when an admin exists; error if empty table and username empty or password < 12 chars.
  - `type Admin struct{ ID int64; Username, PasswordHash string; TOTPSecretEnc []byte; TOTPEnabled bool; GitHubID sql.NullInt64; GitHubLogin sql.NullString }`; `auth.AdminByUsername(ctx, db, u) (Admin, error)`, `auth.AdminByID`, `auth.AdminByGitHubID` (return `sql.ErrNoRows` when missing).
  - `type Session struct{ ID string /*hash*/; AdminID int64; Stage, CSRF, Method, IP, UserAgent, CreatedAt, ExpiresAt string }`; consts `StagePassword = "password"`, `StageFull = "full"`, `TTLPassword = 10*time.Minute`, `TTLFull = 7*24*time.Hour`.
  - `auth.CreateSession(ctx, db, adminID int64, stage, method, ip, ua string, now time.Time) (token string, s Session, err error)`; `auth.LookupSession(ctx, db, token string, now time.Time) (Session, error)` (expired → `sql.ErrNoRows`); `auth.UpgradeSession(ctx, db, oldToken string, now time.Time) (newToken string, s Session, err error)` (deletes old, creates full, same method); `auth.DeleteSession(ctx, db, idHash string) error`; `auth.DeleteAdminSessions(ctx, db, adminID int64) error`; `auth.ListSessions(ctx, db, adminID int64, now time.Time) ([]Session, error)`; `auth.PurgeExpired(ctx, db, now time.Time) error`.

- [ ] **Step 1: Failing tests.**

`crypto_test.go`:

```go
package auth

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
)

func init() { BcryptCost = 4 }

func TestEncryptRoundTripAndTamper(t *testing.T) {
	key := bytes.Repeat([]byte{7}, 32)
	blob, err := Encrypt(key, []byte("JBSWY3DPEHPK3PXP"))
	if err != nil {
		t.Fatal(err)
	}
	got, err := Decrypt(key, blob)
	if err != nil || string(got) != "JBSWY3DPEHPK3PXP" {
		t.Fatalf("%q %v", got, err)
	}
	blob[len(blob)-1] ^= 1
	if _, err := Decrypt(key, blob); err == nil {
		t.Fatal("tampered ciphertext must fail")
	}
}

func TestPassword(t *testing.T) {
	h, _ := HashPassword("correct horse battery")
	if !CheckPassword(h, "correct horse battery") || CheckPassword(h, "wrong") {
		t.Fatal("password check broken")
	}
}

func TestRecoveryCodes(t *testing.T) {
	plain, hashes := NewRecoveryCodes()
	re := regexp.MustCompile(`^[a-z2-9]{4}-[a-z2-9]{4}$`)
	if len(plain) != 8 || len(hashes) != 8 {
		t.Fatal("want 8")
	}
	seen := map[string]bool{}
	for i, c := range plain {
		if !re.MatchString(c) || seen[c] || hashes[i] != SHA256Hex(c) || strings.ContainsAny(c, "01lio") {
			t.Fatalf("bad code %q", c)
		}
		seen[c] = true
	}
}
```

`sessions_test.go`:

```go
package auth

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func seedAdmin(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	if err := Bootstrap(context.Background(), db, "admin", "very-long-password"); err != nil {
		t.Fatal(err)
	}
	a, err := AdminByUsername(context.Background(), db, "admin")
	if err != nil {
		t.Fatal(err)
	}
	return a.ID
}

func TestSessionLifecycle(t *testing.T) {
	ctx, db := context.Background(), storetest.New(t)
	id := seedAdmin(t, db)
	now := time.Now()
	tok, s, err := CreateSession(ctx, db, id, StagePassword, "password", "1.2.3.4", "ua", now)
	if err != nil || s.Stage != StagePassword || s.CSRF == "" || s.ID == tok {
		t.Fatalf("create: %+v %v", s, err)
	}
	if _, err := LookupSession(ctx, db, tok, now.Add(11*time.Minute)); !errors.Is(err, sql.ErrNoRows) {
		t.Fatal("password-stage session must expire after 10 minutes")
	}
	newTok, full, err := UpgradeSession(ctx, db, tok, now)
	if err != nil || full.Stage != StageFull || newTok == tok {
		t.Fatalf("upgrade: %+v %v", full, err)
	}
	if _, err := LookupSession(ctx, db, tok, now); !errors.Is(err, sql.ErrNoRows) {
		t.Fatal("old token must be invalid after rotation")
	}
	if got, err := LookupSession(ctx, db, newTok, now.Add(6*24*time.Hour)); err != nil || got.AdminID != id {
		t.Fatalf("full session lookup: %v", err)
	}
	if err := DeleteAdminSessions(ctx, db, id); err != nil {
		t.Fatal(err)
	}
	if _, err := LookupSession(ctx, db, newTok, now); !errors.Is(err, sql.ErrNoRows) {
		t.Fatal("logout-all must remove session")
	}
}
```

`admin_test.go`:

```go
package auth

import (
	"context"
	"testing"

	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func TestBootstrap(t *testing.T) {
	ctx, db := context.Background(), storetest.New(t)
	if err := Bootstrap(ctx, db, "admin", "short"); err == nil {
		t.Fatal("short password must fail on empty table")
	}
	if err := Bootstrap(ctx, db, "admin", "very-long-password"); err != nil {
		t.Fatal(err)
	}
	if err := Bootstrap(ctx, db, "", ""); err != nil {
		t.Fatal("existing admin: env must be ignored")
	}
	a, err := AdminByUsername(ctx, db, "admin")
	if err != nil || !CheckPassword(a.PasswordHash, "very-long-password") || a.TOTPEnabled {
		t.Fatalf("%+v %v", a, err)
	}
}
```

- [ ] **Step 2: Run** `go test ./internal/auth/` → FAIL.
- [ ] **Step 3: Implement** (`go get golang.org/x/crypto/bcrypt`).
  - `crypto.go`: `aes.NewCipher(key)` → `cipher.NewGCM` → `Seal(nonce, nonce, pt, nil)`; Decrypt splits `blob[:gcm.NonceSize()]`. `RandomToken` uses `crypto/rand` + `base64.RawURLEncoding`. Recovery codes: draw each char with `rand.Int(rand.Reader, big.NewInt(len(alphabet)))`; regenerate on duplicate.
  - `admin.go`: `Bootstrap` counts admins; if 0 validate and `INSERT INTO admins(username,password_hash) VALUES(?,?)`. Getters scan all columns listed in `Admin`.
  - `sessions.go`: token = `RandomToken(32)`, `ID = SHA256Hex(token)`, `CSRF = RandomToken(24)`, `expires_at = now.Add(ttl).UTC().Format(time.RFC3339Nano)`; `LookupSession` selects by hash and compares `expires_at` parsed with `now` (return `sql.ErrNoRows` if expired). `UpgradeSession`: lookup, delete, create `StageFull` with same method/ip/ua in a transaction.
  - `main.go`: `auth.Bootstrap(ctx, db, cfg.AdminUsername, cfg.AdminPassword)`; on error log `"admin bootstrap: set ADMIN_USERNAME and ADMIN_PASSWORD (>=12 chars)"` and exit 1.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(server): auth primitives, admin bootstrap and sessions`.

---

### Task 5: Auth HTTP — login, TOTP, recovery, me, logout, sessions, middleware, rate limit, audit writer

**Files:**
- Create: `server/internal/audit/audit.go`, `server/internal/auth/ratelimit.go`, `server/internal/auth/middleware.go`, `server/internal/auth/handlers.go`, `server/internal/auth/handlers_test.go`
- Modify: `server/internal/app/app.go` (mount), `server/cmd/server/main.go` (hourly `PurgeExpired` ticker)

**Interfaces:**
- Consumes: Task 1 `httpx.*`, `config.Config`; Task 4 everything.
- Produces:
  - `audit.Log(ctx context.Context, db *sql.DB, adminID int64, action, entity, entityID, ip string)` (best-effort; logs errors via slog). `adminID == 0` stores NULL.
  - `auth.Handler{DB *sql.DB; Cfg config.Config; Now func() time.Time; GitHub *GitHubOAuth /* set in Task 6, nil = disabled */}`; `func NewHandler(db *sql.DB, cfg config.Config) *Handler`; `func (h *Handler) Mount(r chi.Router)` mounting under `/api/auth`.
  - Middleware: `func (h *Handler) LoadSession(next http.Handler) http.Handler` (reads cookie `sid`, puts `Session` in ctx when valid); `auth.SessionFrom(ctx) (Session, bool)`; `func RequireFull(next http.Handler) http.Handler` (401 `unauthorized` unless stage full); `func RequireCSRF(next http.Handler) http.Handler` (non-GET/HEAD: header `X-CSRF-Token` must equal session CSRF → else 403 `csrf_failed`); `func (h *Handler) AdminGroup(r chi.Router, fn func(chi.Router))` — helper creating `/api/admin` subrouter with `RequireFull` + `RequireCSRF` used by later tasks: `h.AdminGroup(r, func(ar chi.Router){ ... })`.
  - `auth.ClientIP(r)` method on Handler: `httpx.ClientIP(r, h.Cfg.TrustedProxy)`.
  - Cookie helpers: `h.setSessionCookie(w, token string, ttl time.Duration)`, `h.clearSessionCookie(w)`.
  - Endpoints and JSON:
    - `GET  /api/auth/providers` → `{"github":bool}`
    - `POST /api/auth/login {username,password}` → `200 {"next":"totp"|"totp_setup"}` + password-stage cookie; failures 401 `invalid_credentials`.
    - `POST /api/auth/totp/setup` (password stage, TOTP not enabled; else 409 `totp_already_enabled`) → `{"secret","otpauthUrl"}` issuer `prommin.dev` (use host of PublicURL), account = username.
    - `POST /api/auth/totp/verify {code}` (password stage) → `200 {"recoveryCodes":[...]}` when completing setup, else `200 {}`; upgrades + rotates cookie; bad code 401 `invalid_code`.
    - `POST /api/auth/recovery {code}` (password stage, TOTP enabled) → `200 {}` + upgrade; bad 401 `invalid_code`.
    - `GET  /api/auth/me` (full) → `{"username","githubLogin"|null,"totpEnabled","authMethod","csrfToken"}`.
    - `POST /api/auth/logout` (any stage, CSRF if full) → 204; `POST /api/auth/logout-all` (full+CSRF) → 204.
    - `GET  /api/auth/sessions` (full) → `{"items":[{"id","ip","userAgent","authMethod","createdAt","expiresAt","current":bool}]}` where `id` is the first 12 chars of the hash; `DELETE /api/auth/sessions/{id}` (full+CSRF) deletes the session whose hash has that prefix and belongs to the admin → 204 / 404.
    - `POST /api/auth/recovery-codes/regenerate {code}` (full+CSRF, valid TOTP code) → `{"recoveryCodes":[...]}` replacing old ones.
  - Rate limit: `func (h *Handler) tooManyFailures(ctx, ip) (bool, retryAfter time.Duration)`, `recordFailure(ctx, ip)`, `clearFailures(ctx, ip)` on `login_attempts`.

- [ ] **Step 1: Failing tests** `handlers_test.go` (use `httptest.NewServer` + a cookie jar so cookies flow; TOTP codes from `totp.GenerateCode(secret, time.Now())`):

```go
package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
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
}

func newEnv(t *testing.T) (*client, *Handler) {
	t.Helper()
	db := storetest.New(t)
	if err := Bootstrap(context.Background(), db, "admin", "very-long-password"); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{PublicURL: "http://example.test", TOTPKey: bytes.Repeat([]byte{1}, 32), SessionSecret: bytes.Repeat([]byte{2}, 32)}
	h := NewHandler(db, cfg)
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
	return &client{t: t, base: srv.URL, c: &http.Client{Jar: jar}}, h
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
	code, _ := totp.GenerateCode(secret, time.Now())
	res, m = c.do("POST", "/api/auth/totp/verify", map[string]string{"code": code})
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
	// second login now asks for totp, not setup
	c2, _ := newEnvShared(t, c)
	res, m := c2.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"})
	if res.StatusCode != 200 || m["next"] != "totp" {
		t.Fatalf("second login: %v", m)
	}
	code, _ := totp.GenerateCode(secret, time.Now())
	if res, _ := c2.do("POST", "/api/auth/totp/verify", map[string]string{"code": code}); res.StatusCode != 200 {
		t.Fatal("second verify failed")
	}
}

// newEnvShared returns a new cookie-less client against the same server as c.
func newEnvShared(t *testing.T, c *client) (*client, struct{}) {
	jar, _ := cookiejar.New(nil)
	return &client{t: t, base: c.base, c: &http.Client{Jar: jar}}, struct{}{}
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

func TestRecoveryCodeSingleUse(t *testing.T) {
	c, _ := newEnv(t)
	loginFull(t, c)
	// regenerate to learn codes
	_, m := c.do("POST", "/api/auth/recovery-codes/regenerate", map[string]string{"code": "000000"})
	if m["error"] == nil {
		t.Fatal("regenerate with wrong totp must fail")
	}
	c.do("POST", "/api/auth/logout", nil)
	c.csrf = ""
	// fresh login using a code from a regenerate with valid totp is covered below
}

func TestRecoveryLogin(t *testing.T) {
	c, _ := newEnv(t)
	secret := loginFull(t, c)
	code, _ := totp.GenerateCode(secret, time.Now())
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
	c.do("POST", "/api/auth/logout", nil)
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
```

(Remove the half-finished `TestRecoveryCodeSingleUse` body after `TestRecoveryLogin` passes if it adds nothing — keep only the wrong-TOTP assertion.)

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (`go get github.com/pquerna/otp`).
  - `audit.go`: `INSERT INTO audit_log(admin_id,action,entity,entity_id,ip,created_at)`; `sql.NullInt64{Valid: adminID != 0}`.
  - `ratelimit.go`: window 15 min, limit 5. `tooManyFailures` counts rows with `ip=? AND at > now-15m`; retryAfter = oldest-in-window + 15m − now (min 1s). Check **before** verifying credentials on login/verify/recovery; record failure on every 401; clear on successful login.
  - `handlers.go`: `login` decodes, checks rate limit, `AdminByUsername`; on not found run `CheckPassword(dummyHash, pw)` (dummy hash computed once at `NewHandler`) then 401. On success `clearFailures`, `CreateSession(StagePassword, "password")`, set cookie, audit `login.password_ok`, respond `next`. `totpVerify`: requires session stage password; decrypt secret; `totp.ValidateCustom(code, secret, now, totp.ValidateOpts{Period:30, Skew:1, Digits:6, Algorithm: otp.AlgorithmSHA1})`; if completing setup: in tx set `totp_enabled=1`, delete old recovery codes, insert new hashes; `UpgradeSession`, set cookie TTL full, audit `login.totp` (or `totp.setup`). `recovery`: find unused row with `code_hash = SHA256Hex(strings.ToLower(strings.TrimSpace(code)))`, set `used_at`, upgrade, audit `login.recovery`. `me`, `logout` (delete current, clear cookie, audit), `logoutAll`, `sessions`, `deleteSession`, `regenerate`.
  - Cookie: `http.Cookie{Name:"sid", Value:token, Path:"/", HttpOnly:true, Secure:h.Cfg.CookieSecure, SameSite:http.SameSiteStrictMode, MaxAge:int(ttl.Seconds())}`.
  - `middleware.go`: context key type `ctxKey struct{}`; `LoadSession` stores both `Session` and the raw token (needed by `UpgradeSession`/logout) — define `type current struct{ Session; Token string }`.
  - `AdminGroup`: `r.Route("/api/admin", func(ar chi.Router){ ar.Use(RequireFull, RequireCSRF); fn(ar) })`.
  - `app.go`: `ah := auth.NewHandler(d.DB, d.Cfg)`; `r.Use(ah.LoadSession)`; `ah.Mount(r)`; keep `ah` for later tasks: `ah.AdminGroup(r, func(ar chi.Router){ /* Task 7-10 mounts */ })`.
  - `main.go`: goroutine `time.NewTicker(time.Hour)` → `auth.PurgeExpired`.
- [ ] **Step 4: Run** `go test ./...` → PASS. **Step 5: Commit** — `feat(server): password+TOTP auth, sessions, CSRF and rate limiting`.

---

### Task 6: GitHub OAuth link / login / unlink

**Files:**
- Create: `server/internal/auth/github.go`, `server/internal/auth/github_test.go`
- Modify: `server/internal/auth/handlers.go` (`providers` returns `h.GitHub != nil`; `me` includes github login), `server/internal/app/app.go` (nothing if `NewHandler` builds GitHub from cfg)

**Interfaces:**
- Consumes: Task 4/5 sessions, `Handler`, `config.Config.GitHubEnabled()`, `SessionSecret`.
- Produces: `type GitHubOAuth struct{ Conf *oauth2.Config; UserURL string }` (UserURL default `https://api.github.com/user`, overridable in tests); `NewHandler` sets `h.GitHub` when enabled, with `RedirectURL = cfg.PublicURL + "/api/auth/github/callback"`, scopes `read:user`, endpoint `github.Endpoint`.
  - `GET /api/auth/github/start?mode=login|link` → 302 to GitHub; `mode=link` without full session → 401; GitHub disabled → 404 `github_disabled`.
  - `GET /api/auth/github/callback?code&state` → 302 `/admin` (login ok), `/admin/login?error=github_not_linked`, `/admin/settings?linked=1`; bad/missing state → 400 `invalid_state`.
  - `POST /api/auth/github/unlink {code}` (full+CSRF+valid TOTP) → 204.
  - State cookie `oauth_state` = `base64url(state|mode|expiryUnix)` + `.` + `hex(HMAC-SHA256(SessionSecret, payload))`, `HttpOnly`, `SameSite=Lax` (must survive the top-level redirect back from GitHub), `MaxAge 600`, `Path=/api/auth/github`.

- [ ] **Step 1: Failing tests** `github_test.go` — fake GitHub server providing `/login/oauth/access_token` (returns `{"access_token":"t","token_type":"bearer"}`) and `/user` (returns `{"id":<configurable>,"login":"octo"}`); point `h.GitHub.Conf.Endpoint` and `UserURL` at it; client with `CheckRedirect: func(...) error { return http.ErrUseLastResponse }`:

```go
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

	"github.com/go-chi/chi/v5"
	"golang.org/x/oauth2"

	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func githubEnv(t *testing.T, ghUserID *int64) *client {
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
	r := chi.NewRouter()
	r.Use(h.LoadSession)
	h.Mount(r)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	jar, _ := cookiejar.New(nil)
	return &client{t: t, base: srv.URL, c: &http.Client{Jar: jar, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
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
	loginFull(t, c)
	if r, _ := c.do("GET", "/api/auth/github/start?mode=link", nil); r.StatusCode != 302 {
		t.Fatal("link start")
	}
	res := oauthRoundTrip(t, c, "link")
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
	if res, _ := c.do("GET", "/api/auth/github/callback?code=x&state=forged", nil); res.StatusCode != 400 {
		t.Fatalf("forged state: %d", res.StatusCode)
	}
	if res, _ := c.do("GET", "/api/auth/github/start?mode=link", nil); res.StatusCode != 401 {
		t.Fatalf("link without session: %d", res.StatusCode)
	}
}
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (`go get golang.org/x/oauth2`). Callback: verify cookie HMAC with `hmac.Equal`, expiry, and that the `state` query equals the cookie's state; clear the cookie; `Conf.Exchange(ctx, code)`; `Conf.Client(ctx, tok).Get(UserURL)` decode `{id int64, login string}`. `link` requires current full session (from ctx) → `UPDATE admins SET github_id=?, github_login=? WHERE id=?`, audit `github.link`. `login` → `AdminByGitHubID`; `sql.ErrNoRows` → audit `login.github_denied` (admin 0) + redirect error; else `CreateSession(StageFull,"github")`, cookie, audit `login.github`, redirect `/admin`. Unlink: validate TOTP, `UPDATE admins SET github_id=NULL, github_login=NULL`, audit `github.unlink`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(server): GitHub OAuth login gated on a linked admin account`.

---

### Task 7: Projects API

**Files:**
- Create: `server/internal/projects/model.go`, `server/internal/projects/repo.go`, `server/internal/projects/handlers.go`, `server/internal/projects/handlers_test.go`
- Create: `server/internal/validate/validate.go`, `server/internal/validate/validate_test.go`
- Modify: `server/internal/app/app.go`

**Interfaces:**
- Consumes: `httpx`, `store`, `audit.Log`, `auth.SessionFrom`, `auth.Handler.AdminGroup`.
- Produces:
  - `validate.Slug(s string) string` (returns error message or `""`), `validate.URL(s string) string`, `validate.Tags(tags []string) string`, `validate.Required(s string) string`.
  - `projects.Input{Slug, NameEn, NameTh, DescEn, DescTh string; Tags []string; Metric, RepoURL, DemoURL string; Flagship, Published bool}` (JSON camelCase: `slug,nameEn,nameTh,descEn,descTh,tags,metric,repoUrl,demoUrl,flagship,published`).
  - `projects.Admin` = Input fields + `ID int64 'id'`, `SortOrder int 'sortOrder'`, `CreatedAt, UpdatedAt string`.
  - `projects.Public{Slug string; Name, Description Localized; Tags []string; Metric, RepoURL, DemoURL string; Flagship bool}` with `type Localized struct{ En string 'en'; Th string 'th' }` (both always present; `th` may be `""` — the client falls back).
  - `projects.Handler{DB *sql.DB; IP func(*http.Request) string}`; `MountPublic(r chi.Router)` → `GET /api/projects`; `MountAdmin(ar chi.Router)` → routes under `/projects` (ar is already `/api/admin`).
  - Admin routes: `GET /projects`, `POST /projects` (201), `GET|PUT|DELETE /projects/{id}` (PUT 200 returns Admin, DELETE 204), `PUT /projects/order {ids:[]int64}` (204; 422 if ids don't match the full set).
  - New projects get `sort_order = MAX(sort_order)+1`.

- [ ] **Step 1: Failing tests.** `validate_test.go`:

```go
package validate

import "testing"

func TestSlug(t *testing.T) {
	for _, ok := range []string{"a", "kanban", "iron-coach-th", "a1-b2"} {
		if Slug(ok) != "" {
			t.Errorf("%q should be valid", ok)
		}
	}
	for _, bad := range []string{"", "A", "-a", "a-", "a--b", "a b", "ก", string(make([]byte, 81))} {
		if Slug(bad) == "" {
			t.Errorf("%q should be invalid", bad)
		}
	}
}

func TestURLAndTags(t *testing.T) {
	if URL("") != "" || URL("https://x.y") != "" || URL("javascript:alert(1)") == "" || URL("ftp://x") == "" {
		t.Fatal("url rules")
	}
	long := make([]string, 13)
	if Tags(long) == "" || Tags([]string{string(make([]byte, 33))}) == "" || Tags([]string{"Go"}) != "" || Tags([]string{" "}) == "" {
		t.Fatal("tag rules")
	}
}
```

`handlers_test.go` — build a router with `auth` + `projects` (helper `adminClient(t)` logging in like Task 5's `loginFull`; put a reusable copy in `server/internal/testutil/testutil.go` exposing `testutil.NewServer(t, mount func(r chi.Router, ah *auth.Handler)) (*testutil.Client, *sql.DB)` and `(*Client).Do(method, path string, body any) (*http.Response, map[string]any)`, `(*Client).LoginFull() (totpSecret string)`; refactor nothing else):

```go
package projects

import (
	"net/http"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/testutil"
)

func setup(t *testing.T) *testutil.Client {
	c, _ := testutil.NewServer(t, func(r chi.Router, ah *auth.Handler) {
		h := &Handler{DB: ah.DB, IP: ah.ClientIP}
		h.MountPublic(r)
		ah.AdminGroup(r, h.MountAdmin)
	})
	return c
}

func body(slug string) map[string]any {
	return map[string]any{"slug": slug, "nameEn": "Name " + slug, "nameTh": "", "descEn": "desc", "descTh": "", "tags": []string{"Go"}, "metric": "", "repoUrl": "", "demoUrl": "", "flagship": false, "published": true}
}

func TestProjectsCRUD(t *testing.T) {
	c := setup(t)
	c.LoginFull()
	res, m := c.Do("POST", "/api/admin/projects", body("alpha"))
	if res.StatusCode != 201 {
		t.Fatalf("create: %d %v", res.StatusCode, m)
	}
	id := int64(m["id"].(float64))
	if res, m := c.Do("POST", "/api/admin/projects", body("alpha")); res.StatusCode != 409 || m["error"].(map[string]any)["code"] != "slug_taken" {
		t.Fatalf("dup: %d %v", res.StatusCode, m)
	}
	b := body("alpha")
	b["published"] = false
	if res, _ := c.Do("PUT", "/api/admin/projects/"+itoa(id), b); res.StatusCode != 200 {
		t.Fatal("update")
	}
	_, pub := c.Do("GET", "/api/projects", nil)
	if len(pub["items"].([]any)) != 0 {
		t.Fatal("unpublished project must be hidden publicly")
	}
	if res, _ := c.Do("DELETE", "/api/admin/projects/"+itoa(id), nil); res.StatusCode != 204 {
		t.Fatal("delete")
	}
	if res, _ := c.Do("GET", "/api/admin/projects/"+itoa(id), nil); res.StatusCode != 404 {
		t.Fatal("deleted must 404")
	}
}

func TestProjectValidation(t *testing.T) {
	c := setup(t)
	c.LoginFull()
	b := body("Bad Slug")
	b["repoUrl"] = "javascript:alert(1)"
	b["nameEn"] = ""
	res, m := c.Do("POST", "/api/admin/projects", b)
	f := m["error"].(map[string]any)["fields"].(map[string]any)
	if res.StatusCode != 422 || f["slug"] == nil || f["repoUrl"] == nil || f["nameEn"] == nil {
		t.Fatalf("%d %v", res.StatusCode, m)
	}
}

func TestPublicShapeAndOrder(t *testing.T) {
	c := setup(t)
	c.LoginFull()
	_, a := c.Do("POST", "/api/admin/projects", body("a"))
	_, b := c.Do("POST", "/api/admin/projects", body("b"))
	ids := []int64{int64(b["id"].(float64)), int64(a["id"].(float64))}
	if res, _ := c.Do("PUT", "/api/admin/projects/order", map[string]any{"ids": ids}); res.StatusCode != 204 {
		t.Fatal("order")
	}
	if res, _ := c.Do("PUT", "/api/admin/projects/order", map[string]any{"ids": ids[:1]}); res.StatusCode != 422 {
		t.Fatal("partial order must 422")
	}
	_, pub := c.Do("GET", "/api/projects", nil)
	items := pub["items"].([]any)
	first := items[0].(map[string]any)
	if first["slug"] != "b" || first["name"].(map[string]any)["en"] != "Name b" {
		t.Fatalf("public: %v", items)
	}
	if _, ok := first["name"].(map[string]any)["th"]; !ok {
		t.Fatal("th key must be present (empty string) for client fallback")
	}
	if _, ok := first["id"]; ok {
		t.Fatal("public payload must not leak internal id")
	}
}

func TestAdminRequiresLogin(t *testing.T) {
	c := setup(t)
	if res, _ := c.Do("GET", "/api/admin/projects", nil); res.StatusCode != http.StatusUnauthorized {
		t.Fatal("anonymous admin access")
	}
}

func itoa(i int64) string { return strconv.FormatInt(i, 10) }
```

(add `"strconv"` import.)

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `testutil`, `validate`, then projects (repo uses `database/sql` with explicit column lists; tags stored via `json.Marshal`; nil tags → `[]`). Map `sql.ErrNoRows` → `httpx.ErrNotFound`, `store.IsUniqueViolation` → 409 `slug_taken`. Audit `project.create|update|delete|reorder`. Mount in `app.go`. `Input.validate() map[string]string` trims strings first.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(server): projects public and admin API`.

---
### Task 8: Media upload API

**Files:**
- Create: `server/internal/media/media.go`, `server/internal/media/handlers.go`, `server/internal/media/handlers_test.go`
- Modify: `server/internal/app/app.go`

**Interfaces:**
- Consumes: `testutil.NewServer`, `auth.Handler.AdminGroup`, `audit.Log`, `httpx`, `store`.
- Produces:
  - `media.Item{ID int64 'id'; URL string 'url' /* "/uploads/"+filename */; Filename, OriginalName, Mime string; Size int64; Width, Height int; CreatedAt string}` (JSON camelCase).
  - `media.Handler{DB *sql.DB; Dir string /* DataDir/uploads */; IP func(*http.Request) string}`; `MountAdmin(ar chi.Router)` → `GET /media`, `POST /media` (201 Item), `DELETE /media/{id}` (204); `ServeUploads(r chi.Router)` → `GET /uploads/{file}`.
  - `media.URLFor(filename string) string` (used by posts for `coverUrl`).
  - `media.MaxUpload = 5 << 20`.

- [ ] **Step 1: Failing tests** `handlers_test.go` — helper builds multipart bodies; PNG fixture generated in-test with `image/png` encoding a 3×2 `image.NewRGBA`:

```go
package media

import (
	"bytes"
	"image"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/testutil"
)

func pngBytes(t *testing.T) []byte {
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 3, 2))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func setup(t *testing.T) (*testutil.Client, string) {
	dir := t.TempDir()
	c, _ := testutil.NewServer(t, func(r chi.Router, ah *auth.Handler) {
		h := &Handler{DB: ah.DB, Dir: dir, IP: ah.ClientIP}
		h.ServeUploads(r)
		ah.AdminGroup(r, h.MountAdmin)
	})
	c.LoginFull()
	return c, dir
}

func upload(t *testing.T, c *testutil.Client, name string, data []byte) (*http.Response, map[string]any) {
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	fw, _ := w.CreateFormFile("file", name)
	fw.Write(data)
	w.Close()
	return c.DoRaw("POST", "/api/admin/media", w.FormDataContentType(), &b)
}

func TestUploadServeDelete(t *testing.T) {
	c, dir := setup(t)
	res, m := upload(t, c, "shot.png", pngBytes(t))
	if res.StatusCode != 201 || m["mime"] != "image/png" || m["width"].(float64) != 3 || m["height"].(float64) != 2 {
		t.Fatalf("upload: %d %v", res.StatusCode, m)
	}
	url := m["url"].(string)
	if !strings.HasPrefix(url, "/uploads/") || !strings.HasSuffix(url, ".png") || strings.Contains(url, "shot") {
		t.Fatalf("url must be uuid-based: %s", url)
	}
	get, _ := http.Get(c.Base + url)
	body, _ := io.ReadAll(get.Body)
	if get.StatusCode != 200 || !strings.Contains(get.Header.Get("Cache-Control"), "immutable") || !bytes.Equal(body, pngBytes(t)) {
		t.Fatalf("serve: %d %s", get.StatusCode, get.Header.Get("Cache-Control"))
	}
	id := int64(m["id"].(float64))
	if res, _ := c.Do("DELETE", "/api/admin/media/"+strconv.FormatInt(id, 10), nil); res.StatusCode != 204 {
		t.Fatal("delete")
	}
	if entries, _ := os.ReadDir(dir); len(entries) != 0 {
		t.Fatal("file must be removed from disk")
	}
}

func TestRejectsDisguisedAndOversize(t *testing.T) {
	c, _ := setup(t)
	if res, m := upload(t, c, "evil.png", []byte("<script>alert(1)</script>")); res.StatusCode != 422 {
		t.Fatalf("text as png: %d %v", res.StatusCode, m)
	}
	if res, m := upload(t, c, "x.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`)); res.StatusCode != 422 {
		t.Fatalf("svg must be rejected: %d %v", res.StatusCode, m)
	}
	big := append(pngBytes(t), make([]byte, MaxUpload)...)
	if res, _ := upload(t, c, "big.png", big); res.StatusCode != 413 {
		t.Fatalf("oversize: %d", res.StatusCode)
	}
}

func TestUploadsPathTraversal(t *testing.T) {
	c, dir := setup(t)
	os.WriteFile(filepath.Join(filepath.Dir(dir), "secret.txt"), []byte("s"), 0o600)
	for _, p := range []string{"/uploads/..%2fsecret.txt", "/uploads/%2e%2e/secret.txt"} {
		res, _ := http.Get(c.Base + p)
		if res.StatusCode == 200 {
			t.Fatalf("%s must not be served", p)
		}
	}
}
```

(`testutil.Client` must also expose `Base string` and `DoRaw(method, path, contentType string, body io.Reader) (*http.Response, map[string]any)` — add them in this task if Task 7 didn't. Add `strconv` import.)

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (`go get golang.org/x/image/webp`, blank-import `image/gif`, `image/jpeg`, `image/png`, `golang.org/x/image/webp` for `DecodeConfig`). Upload: `r.Body = http.MaxBytesReader(w, r.Body, MaxUpload+1<<10)`; `r.ParseMultipartForm(MaxUpload)`; `*http.MaxBytesError` → 413 `too_large`; read file fully (bounded), `http.DetectContentType(first512)` must be one of `image/png`, `image/jpeg`, `image/gif`, `image/webp` else 422 `validation_failed` fields `{"file":"must be a PNG, JPEG, WebP or GIF image"}`; `image.DecodeConfig` must succeed (same 422). Filename = random 16-byte hex + ext by mime (`.png .jpg .gif .webp`); write with `os.WriteFile(…, 0o640)`; insert row; audit `media.create`. Serve: `file := chi.URLParam(r,"file")`; reject unless it matches `^[a-f0-9]{32}\.(png|jpg|gif|webp)$` (404); `http.ServeFile` with headers `Cache-Control: public, max-age=31536000, immutable`. Delete: lookup row, `os.Remove`, delete row, audit. In `app.go`: `mh := &media.Handler{DB: d.DB, Dir: filepath.Join(d.Cfg.DataDir, "uploads"), IP: ah.ClientIP}`; `mh.ServeUploads(r)`; inside AdminGroup `mh.MountAdmin(ar)`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(server): image upload, serving and deletion`.

---

### Task 9: Posts API

**Files:**
- Create: `server/internal/posts/model.go`, `server/internal/posts/repo.go`, `server/internal/posts/handlers.go`, `server/internal/posts/handlers_test.go`
- Modify: `server/internal/app/app.go`

**Interfaces:**
- Consumes: `validate.*`, `media.URLFor`, `testutil`, `audit.Log`, `auth.Handler.AdminGroup`.
- Produces:
  - `posts.Input{Slug, TitleEn, TitleTh, ExcerptEn, ExcerptTh, BodyEn, BodyTh string; Tags []string; CoverMediaID *int64; Status string}` JSON `slug,titleEn,titleTh,excerptEn,excerptTh,bodyEn,bodyTh,tags,coverMediaId,status`.
  - `posts.Admin` = Input + `id, coverUrl (string, "" if none), publishedAt (*string), createdAt, updatedAt`.
  - `posts.PublicSummary{Slug; Title, Excerpt Localized; Tags; CoverURL 'coverUrl'; PublishedAt 'publishedAt'}`; `posts.Public` = summary + `Body Localized`. `Localized{En,Th}` as in projects (define locally in posts, do not import projects).
  - `posts.Handler{DB; IP}`; `MountPublic(r)` → `GET /api/posts`, `GET /api/posts/{slug}`; `MountAdmin(ar)` → `GET /posts?status=draft|published`, `POST /posts` (201), `GET|PUT|DELETE /posts/{id}`.
  - Repo funcs reused by web (Task 10): `posts.PublishedBySlug(ctx, db, slug string) (Public, error)` and `posts.ListPublished(ctx, db, tag string, limit, offset int) ([]PublicSummary, int /*total*/, error)`.
  - List response `{"items":[...],"page":N,"perPage":N,"total":N}`; `page` ≥ 1 default 1; `perPage` default 10, max 50 (values outside → clamp).
  - `published_at` set when status becomes `published` and it is NULL; never cleared (republishing keeps the original date).
  - Validation: `slug`, `titleEn` required; `status` ∈ {draft, published}; `coverMediaId` must reference an existing media row (422 field `coverMediaId`); tags rules; body ≤ 200 000 chars per language.
  - Tag filter: `EXISTS (SELECT 1 FROM json_each(posts.tags) WHERE value = ?)`.

- [ ] **Step 1: Failing tests:**

```go
package posts

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/testutil"
)

func setup(t *testing.T) *testutil.Client {
	c, _ := testutil.NewServer(t, func(r chi.Router, ah *auth.Handler) {
		h := &Handler{DB: ah.DB, IP: ah.ClientIP}
		h.MountPublic(r)
		ah.AdminGroup(r, h.MountAdmin)
	})
	c.LoginFull()
	return c
}

func post(slug, status string, tags ...string) map[string]any {
	if tags == nil {
		tags = []string{}
	}
	return map[string]any{"slug": slug, "titleEn": "T " + slug, "titleTh": "", "excerptEn": "ex", "excerptTh": "", "bodyEn": "# Hi", "bodyTh": "", "tags": tags, "coverMediaId": nil, "status": status}
}

func id(m map[string]any) string { return strconv.FormatInt(int64(m["id"].(float64)), 10) }

func TestDraftsAreInvisiblePublicly(t *testing.T) {
	c := setup(t)
	c.Do("POST", "/api/admin/posts", post("secret", "draft"))
	_, list := c.Do("GET", "/api/posts", nil)
	if list["total"].(float64) != 0 {
		t.Fatalf("draft listed: %v", list)
	}
	if res, _ := c.Do("GET", "/api/posts/secret", nil); res.StatusCode != http.StatusNotFound {
		t.Fatal("draft readable by slug")
	}
}

func TestPublishKeepsOriginalDate(t *testing.T) {
	c := setup(t)
	_, m := c.Do("POST", "/api/admin/posts", post("p", "published"))
	first := m["publishedAt"].(string)
	b := post("p", "draft")
	c.Do("PUT", "/api/admin/posts/"+id(m), b)
	b["status"] = "published"
	_, m2 := c.Do("PUT", "/api/admin/posts/"+id(m), b)
	if m2["publishedAt"].(string) != first {
		t.Fatalf("publishedAt changed: %v -> %v", first, m2["publishedAt"])
	}
	_, pub := c.Do("GET", "/api/posts/p", nil)
	if pub["body"].(map[string]any)["en"] != "# Hi" || pub["title"].(map[string]any)["th"] != "" {
		t.Fatalf("public shape: %v", pub)
	}
}

func TestListPaginationAndTagFilter(t *testing.T) {
	c := setup(t)
	for i := 0; i < 12; i++ {
		tag := "go"
		if i%2 == 1 {
			tag = "react"
		}
		c.Do("POST", "/api/admin/posts", post("p"+strconv.Itoa(i), "published", tag))
	}
	_, m := c.Do("GET", "/api/posts?page=2&perPage=5", nil)
	if m["total"].(float64) != 12 || len(m["items"].([]any)) != 5 || m["page"].(float64) != 2 {
		t.Fatalf("page 2: %v", m)
	}
	if _, has := m["items"].([]any)[0].(map[string]any)["body"]; has {
		t.Fatal("list items must omit body")
	}
	_, m = c.Do("GET", "/api/posts?tag=react&perPage=500", nil)
	if m["total"].(float64) != 6 || m["perPage"].(float64) != 50 {
		t.Fatalf("tag filter / clamp: %v", m)
	}
}

func TestPostValidation(t *testing.T) {
	c := setup(t)
	b := post("ok", "archived")
	b["coverMediaId"] = 999
	b["titleEn"] = ""
	res, m := c.Do("POST", "/api/admin/posts", b)
	f := m["error"].(map[string]any)["fields"].(map[string]any)
	if res.StatusCode != 422 || f["status"] == nil || f["coverMediaId"] == nil || f["titleEn"] == nil {
		t.Fatalf("%d %v", res.StatusCode, m)
	}
	c.Do("POST", "/api/admin/posts", post("dup", "draft"))
	if res, _ := c.Do("POST", "/api/admin/posts", post("dup", "draft")); res.StatusCode != 409 {
		t.Fatal("slug conflict")
	}
}
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (repo with explicit columns, `LEFT JOIN media` for `coverUrl` via `media.URLFor`; audit `post.create|update|delete`; mount in `app.go`). Admin list ordered `updated_at DESC`; public `published_at DESC, id DESC`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(server): bilingual blog posts API`.

---

### Task 10: Web serving — SPA, meta injection, RSS, sitemap, audit listing

**Files:**
- Create: `server/internal/web/web.go`, `server/internal/web/meta.go`, `server/internal/web/feeds.go`, `server/internal/web/web_test.go`, `server/internal/web/dist/.keep`, `server/internal/web/embed.go`
- Modify: `server/internal/audit/audit.go` (add `Handler`), `server/internal/app/app.go`, `server/cmd/server/main.go`, `app/index.html`

**Interfaces:**
- Consumes: `posts.PublishedBySlug`, `posts.ListPublished`, `config.PublicURL`.
- Produces:
  - `web.Dist() fs.FS` (from `//go:embed all:dist` in `embed.go`, sub-FS rooted at `dist`).
  - `web.Handler{DB *sql.DB; PublicURL string; Dist fs.FS}`; `Mount(r chi.Router)` → `GET /rss.xml`, `GET /sitemap.xml`, and `r.NotFound(h.spa)` serving static files or the meta-injected index.
  - `web.Meta{Title, Description, Image, URL string; NoIndex bool}`; `web.RenderIndex(index []byte, m Meta) []byte` replaces `<!--app-meta-->` (and the existing `<title>…</title>` is removed from `index.html` by this task) with escaped tags.
  - `audit.Handler{DB}`; `MountAdmin(ar)` → `GET /audit?page=` → `{"items":[{"id","action","entity","entityId","ip","createdAt"}],"page","total"}` (50 per page, newest first).
  - Default meta: title `Prommin L. — Full-Stack Developer`, description `Full-stack developer building real-time systems, enterprise backends and developer automation.`, image `PublicURL + "/og.png"` (if `og.png` is absent in dist use `PublicURL+"/profile.png"`).

- [ ] **Step 1: Edit `app/index.html`:** replace the `<title>` line with `<!--app-meta-->` and keep a fallback `<title>Prommin L.</title>` **after** it only for dev (Vite) — `RenderIndex` removes any `<title>…</title>` before injecting. Also add IBM Plex Sans Thai to the Google Fonts URL: `family=IBM+Plex+Sans+Thai:wght@400;500;700`.

- [ ] **Step 2: Failing tests** `web_test.go`:

```go
package web

import (
	"context"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

const index = `<!doctype html><html><head><!--app-meta--><title>dev</title></head><body></body></html>`

func setup(t *testing.T) (*chi.Mux, func(slug, title, status string)) {
	db := storetest.New(t)
	h := &Handler{DB: db, PublicURL: "https://ex.com", Dist: fstest.MapFS{
		"index.html":       {Data: []byte(index)},
		"assets/app-1a.js": {Data: []byte("console.log(1)")},
	}}
	r := chi.NewRouter()
	h.Mount(r)
	add := func(slug, title, status string) {
		pub := any(nil)
		if status == "published" {
			pub = store.Now()
		}
		_, err := db.ExecContext(context.Background(), `INSERT INTO posts(slug,title_en,excerpt_en,status,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
			slug, title, "excerpt "+slug, status, pub, store.Now(), store.Now())
		if err != nil {
			t.Fatal(err)
		}
	}
	return r, add
}

func get(r *chi.Mux, path string) (int, string, string) {
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
	b, _ := io.ReadAll(rec.Body)
	return rec.Code, string(b), rec.Header().Get("Cache-Control")
}

func TestSPAFallbackAndAssets(t *testing.T) {
	r, _ := setup(t)
	code, body, cc := get(r, "/assets/app-1a.js")
	if code != 200 || body != "console.log(1)" || !strings.Contains(cc, "immutable") {
		t.Fatalf("asset: %d %s", code, cc)
	}
	code, body, cc = get(r, "/some/deep/route")
	if code != 200 || !strings.Contains(body, "<title>Prommin L.") || strings.Contains(body, "<title>dev</title>") || cc != "no-cache" {
		t.Fatalf("fallback: %d %s %s", code, cc, body)
	}
	if code, _, _ := get(r, "/assets/missing.js"); code != 404 {
		t.Fatal("missing asset must 404, not index")
	}
}

func TestPostMetaEscapedAndDraftHidden(t *testing.T) {
	r, add := setup(t)
	add("xss", `</title><script>alert(1)</script>`, "published")
	add("draft", "Secret Draft", "draft")
	_, body, _ := get(r, "/blog/xss")
	if strings.Contains(body, "<script>alert(1)") || !strings.Contains(body, "&lt;/title&gt;&lt;script&gt;") {
		t.Fatalf("meta not escaped: %s", body)
	}
	if !strings.Contains(body, `<link rel="canonical" href="https://ex.com/blog/xss">`) {
		t.Fatalf("canonical: %s", body)
	}
	_, body, _ = get(r, "/blog/draft")
	if strings.Contains(body, "Secret Draft") {
		t.Fatal("draft meta leaked")
	}
	_, body, _ = get(r, "/admin/projects")
	if !strings.Contains(body, `<meta name="robots" content="noindex">`) {
		t.Fatal("admin must be noindex")
	}
}

func TestFeeds(t *testing.T) {
	r, add := setup(t)
	add("hello", "Hello & <World>", "published")
	add("hidden", "Hidden", "draft")
	code, rss, _ := get(r, "/rss.xml")
	if code != 200 || !strings.Contains(rss, "<link>https://ex.com/blog/hello</link>") || strings.Contains(rss, "hidden") || !strings.Contains(rss, "Hello &amp; &lt;World&gt;") {
		t.Fatalf("rss: %s", rss)
	}
	_, sm, _ := get(r, "/sitemap.xml")
	for _, want := range []string{"<loc>https://ex.com/</loc>", "<loc>https://ex.com/blog</loc>", "<loc>https://ex.com/blog/hello</loc>"} {
		if !strings.Contains(sm, want) {
			t.Fatalf("sitemap missing %s: %s", want, sm)
		}
	}
	if strings.Contains(sm, "hidden") {
		t.Fatal("draft in sitemap")
	}
}
```

- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.**
  - `embed.go`: `//go:embed all:dist` `var distFS embed.FS`; `func Dist() fs.FS { sub, _ := fs.Sub(distFS, "dist"); return sub }`.
  - `spa`: clean path; if it has a file extension → serve from Dist if present (`assets/*` → `Cache-Control: public, max-age=31536000, immutable`, others `public, max-age=3600`), else 404. Paths starting with `/api/` or `/uploads/` → JSON 404 via `httpx.Fail(w, httpx.ErrNotFound)`. Everything else → index with meta; `Cache-Control: no-cache`; `Content-Type: text/html; charset=utf-8`. If `index.html` missing (dev build without frontend) → 503 text `frontend not built`.
  - Meta: `/blog/{slug}` → `posts.PublishedBySlug`; title `"<titleEn> — Prommin L."`, description = excerptEn (fallback first 160 chars of bodyEn stripped of `#*_\`>[]()!`), image = coverUrl absolute or default. `/blog` → title `Blog — Prommin L.`. `/admin*` → `NoIndex`. Tags rendered with `html.EscapeString`: `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `og:url`, `og:type` (`article` for posts, else `website`), `twitter:card summary_large_image`, `<link rel="canonical">`, optional robots.
  - Feeds via `encoding/xml` structs (RSS 2.0 channel with title/link/description, items with title/link/guid/pubDate RFC1123Z/description = excerpt; sitemap urlset with `lastmod`). Latest 20 / all published.
  - `audit.Handler` + mount in AdminGroup.
  - `app.go`: `web.Handler{DB, PublicURL: d.Cfg.PublicURL, Dist: d.Dist}.Mount(r)` **last**. `main.go`: `Dist: web.Dist()`.
  - Update `app/app_test.go` expectation only if needed (healthz unchanged).
- [ ] **Step 5: Run** `go test ./...` → PASS. **Step 6: Commit** — `feat(server): SPA serving with per-post meta, RSS, sitemap and audit log API`.

---

### Task 11: CLI subcommands, Dockerfile, compose, Caddy, CI, deploy docs

**Files:**
- Modify: `server/cmd/server/main.go`
- Create: `server/cmd/server/main_test.go`, `Dockerfile`, `.dockerignore`, `deploy/docker-compose.yml`, `deploy/Caddyfile`, `deploy/.env.example`, `deploy/backup.sh`, `deploy/README.md`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `store.Backup`, `config.Load`, `app.New`, `web.Dist`.
- Produces: binary `server` with subcommands: no args / `serve` → HTTP server with graceful shutdown on SIGINT/SIGTERM (10 s); `healthcheck` → GET `http://127.0.0.1` + port of `ADDR` + `/healthz`, exit 0 on 200 else 1 (does **not** require full config); `backup <dest>` → opens `DATA_DIR/app.db`, `store.Backup`, exit 0.
  - Refactor `main` into `func run(args []string, getenv func(string) string, stdout io.Writer) int` for testability.

- [ ] **Step 1: Failing test** `main_test.go`:

```go
package main

import (
	"bytes"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

func TestBackupSubcommand(t *testing.T) {
	dir := t.TempDir()
	db, _ := store.Open(filepath.Join(dir, "app.db"))
	store.Migrate(db)
	db.Close()
	dest := filepath.Join(dir, "out.db")
	env := map[string]string{"DATA_DIR": dir}
	if code := run([]string{"backup", dest}, func(k string) string { return env[k] }, &bytes.Buffer{}); code != 0 {
		t.Fatalf("exit %d", code)
	}
	if _, err := os.Stat(dest); err != nil {
		t.Fatal(err)
	}
}

func TestHealthcheckSubcommand(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			w.WriteHeader(200)
		}
	}))
	defer srv.Close()
	_, port, _ := net.SplitHostPort(srv.Listener.Addr().String())
	env := map[string]string{"ADDR": ":" + port}
	if code := run([]string{"healthcheck"}, func(k string) string { return env[k] }, &bytes.Buffer{}); code != 0 {
		t.Fatalf("healthy exit %d", code)
	}
	srv.Close()
	if code := run([]string{"healthcheck"}, func(k string) string { return env[k] }, &bytes.Buffer{}); code != 1 {
		t.Fatal("down server must exit 1")
	}
}

func TestUnknownSubcommand(t *testing.T) {
	if code := run([]string{"nope"}, func(string) string { return "" }, &bytes.Buffer{}); code != 2 {
		t.Fatal("unknown subcommand must exit 2")
	}
}
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement `run`** (backup defaults `DATA_DIR` to `/data`; healthcheck client timeout 3 s).

- [ ] **Step 4: Dockerfile** (repo root):

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS web
WORKDIR /src/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

FROM golang:1.27-alpine AS server
WORKDIR /src/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
COPY --from=web /src/app/dist ./internal/web/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=server /out/server /server
ENV DATA_DIR=/data ADDR=:8080
EXPOSE 8080
VOLUME ["/data"]
USER nonroot
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD ["/server", "healthcheck"]
ENTRYPOINT ["/server"]
```

`.dockerignore`: `**/node_modules`, `app/dist`, `.git`, `.superpowers`, `.agents`, `.claude`, `**/*.db*`, `e2e`, `docs`.

> The `/data` volume must be writable by uid 65532 (nonroot). In compose, the named volume is initialised from the image; add to the Dockerfile's server stage `RUN mkdir -p /out/data` and `COPY --from=server --chown=65532:65532 /out/data /data` in the final stage so the mount point is owned by nonroot.

- [ ] **Step 5: deploy files.**

`deploy/docker-compose.yml`:

```yaml
services:
  app:
    image: ${APP_IMAGE:-ghcr.io/prommin01st-lang/petanque-website:latest}
    build:
      context: ..
    env_file: .env
    environment:
      PUBLIC_URL: https://${DOMAIN}
    volumes:
      - app-data:/data
    restart: unless-stopped
    networks: [internal]

  caddy:
    image: caddy:2-alpine
    env_file: .env
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      app:
        condition: service_healthy
    restart: unless-stopped
    networks: [internal]

volumes:
  app-data:
  caddy-data:
  caddy-config:

networks:
  internal:
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

`deploy/Caddyfile`:

```
{$DOMAIN} {
	encode zstd gzip
	header Strict-Transport-Security "max-age=31536000; includeSubDomains"
	reverse_proxy app:8080
}
```

`deploy/.env.example` — every variable from spec §3.2 with comments, `DOMAIN=example.com`, `TRUSTED_PROXY_CIDR=172.28.0.0/16`, and generation hints (`openssl rand -base64 48` for `SESSION_SECRET`, `openssl rand -base64 32` for `TOTP_ENC_KEY`).

`deploy/backup.sh` (executable): `set -euo pipefail`; `cd "$(dirname "$0")"`; `STAMP=$(date +%Y%m%d-%H%M%S)`; `BACKUP_DIR=${BACKUP_DIR:-./backups}`; `docker compose exec -T app /server backup /data/backup-$STAMP.db`; `docker compose cp app:/data/backup-$STAMP.db "$BACKUP_DIR/"`; `docker compose cp app:/data/uploads "$BACKUP_DIR/uploads-$STAMP"` then `tar -czf "$BACKUP_DIR/uploads-$STAMP.tgz" -C "$BACKUP_DIR" "uploads-$STAMP" && rm -rf "$BACKUP_DIR/uploads-$STAMP"`; `docker compose exec -T app /server rm-backup` is not available in distroless — instead name the in-container file under `/data/backups/` and prune with `ls -1t "$BACKUP_DIR"/backup-*.db | tail -n +15 | xargs -r rm` locally (the in-container copy is overwritten each day by using the fixed name `/data/backup-latest.db`). Use the fixed name.

`deploy/README.md`: prerequisites (Docker, DNS A record), `cp .env.example .env` + fill, create GitHub OAuth App (Homepage `https://DOMAIN`, callback `https://DOMAIN/api/auth/github/callback`), `docker compose up -d`, first login at `/admin/login` → TOTP setup → save recovery codes → Settings → Link GitHub, backups via cron (`0 3 * * * /opt/site/deploy/backup.sh`), restore (stop app, copy db into volume via `docker run --rm -v deploy_app-data:/data -v $PWD:/b alpine cp /b/backup.db /data/app.db`, chown 65532), update (`docker compose pull && docker compose up -d`).

- [ ] **Step 6: CI** `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
  packages: write
jobs:
  web:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: app } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: app/package-lock.json }
      - run: npm ci
      - run: npm test -- --run
      - run: npm run build
  server:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: server } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version-file: server/go.mod, cache-dependency-path: server/go.sum }
      - run: go vet ./...
      - run: go test -race ./...
  image:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [web, server]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest,ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

(`npm test` is added in Task 12; until then the web job would fail — this task only writes the file, CI runs after push.) Lint is excluded from CI because of the 9 pre-existing errors.

- [ ] **Step 7: Verify** `go test ./...` PASS; `docker build -t petanque-site:dev .` succeeds (the frontend at this point still builds with HashRouter — fine); `docker run --rm -e PUBLIC_URL=http://localhost:8080 -e SESSION_SECRET=$(openssl rand -base64 48) -e TOTP_ENC_KEY=$(openssl rand -base64 32) -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=change-me-please -e COOKIE_SECURE=false -p 8080:8080 petanque-site:dev` then `curl -s localhost:8080/healthz` → `{"ok":true}` and `curl -s localhost:8080/api/projects | head -c 200` shows seeded projects. Stop the container.
- [ ] **Step 8: Commit** — `feat: docker image, compose deployment with caddy, CI and deploy docs`.

---

## Phase 2 — Frontend platform

### Task 12: Router, API client, React Query, Vitest, i18n plumbing

**Files:**
- Modify: `app/package.json`, `app/vite.config.ts`, `app/src/App.tsx`, `app/src/main.tsx`, `app/src/components/Navbar.tsx`, `app/src/components/Footer.tsx`, `app/src/i18n/translations.ts`, `app/tsconfig.app.json` (add `"types": ["vitest/globals"]` only if needed)
- Create: `app/vitest.config.ts`, `app/src/test/setup.ts`, `app/src/lib/api.ts`, `app/src/lib/api.test.ts`, `app/src/lib/types.ts`, `app/src/lib/pick.ts`, `app/src/lib/pick.test.ts`, `app/src/lib/queryClient.ts`, `app/src/pages/HomePage.tsx`, `app/src/pages/NotFoundPage.tsx`
- Delete: `app/src/sections/ContactSection.tsx` (unused), and its `contact` translation keys only if no remaining references (Navbar may reference `nav.contact` — remove that nav item).

**Interfaces:**
- Produces (TypeScript):

```ts
// src/lib/types.ts
export interface Localized { en: string; th: string }
export interface Project { slug: string; name: Localized; description: Localized; tags: string[]; metric: string; repoUrl: string; demoUrl: string; flagship: boolean }
export interface PostSummary { slug: string; title: Localized; excerpt: Localized; tags: string[]; coverUrl: string; publishedAt: string }
export interface Post extends PostSummary { body: Localized }
export interface Paged<T> { items: T[]; page: number; perPage: number; total: number }
export interface Me { username: string; githubLogin: string | null; totpEnabled: boolean; authMethod: 'password' | 'github'; csrfToken: string }
export interface AdminProject { id: number; slug: string; nameEn: string; nameTh: string; descEn: string; descTh: string; tags: string[]; metric: string; repoUrl: string; demoUrl: string; flagship: boolean; published: boolean; sortOrder: number; createdAt: string; updatedAt: string }
export type ProjectInput = Omit<AdminProject, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt'>
export type PostStatus = 'draft' | 'published'
export interface AdminPost { id: number; slug: string; titleEn: string; titleTh: string; excerptEn: string; excerptTh: string; bodyEn: string; bodyTh: string; tags: string[]; coverMediaId: number | null; coverUrl: string; status: PostStatus; publishedAt: string | null; createdAt: string; updatedAt: string }
export type PostInput = Omit<AdminPost, 'id' | 'coverUrl' | 'publishedAt' | 'createdAt' | 'updatedAt'>
export interface MediaItem { id: number; url: string; filename: string; originalName: string; mime: string; size: number; width: number; height: number; createdAt: string }
export interface SessionInfo { id: string; ip: string; userAgent: string; authMethod: string; createdAt: string; expiresAt: string; current: boolean }
export interface AuditEntry { id: number; action: string; entity: string; entityId: string; ip: string; createdAt: string }
export type LoginNext = 'totp' | 'totp_setup'
```

```ts
// src/lib/api.ts
export class ApiError extends Error {
  status: number; code: string; fields: Record<string, string>
  constructor(status: number, code: string, message: string, fields?: Record<string, string>)
}
export function setCsrfToken(token: string | null): void
export async function request<T>(method: 'GET'|'POST'|'PUT'|'DELETE', path: string, body?: unknown): Promise<T>
export async function upload(file: File): Promise<MediaItem>
export const api: {
  projects(): Promise<{ items: Project[] }>
  posts(params?: { page?: number; perPage?: number; tag?: string }): Promise<Paged<PostSummary>>
  post(slug: string): Promise<Post>
  auth: {
    providers(): Promise<{ github: boolean }>
    login(username: string, password: string): Promise<{ next: LoginNext }>
    totpSetup(): Promise<{ secret: string; otpauthUrl: string }>
    totpVerify(code: string): Promise<{ recoveryCodes?: string[] }>
    recovery(code: string): Promise<Record<string, never>>
    me(): Promise<Me>
    logout(): Promise<void>
    logoutAll(): Promise<void>
    sessions(): Promise<{ items: SessionInfo[] }>
    revokeSession(id: string): Promise<void>
    regenerateRecovery(code: string): Promise<{ recoveryCodes: string[] }>
    unlinkGitHub(code: string): Promise<void>
  }
  admin: {
    projects(): Promise<{ items: AdminProject[] }>
    createProject(p: ProjectInput): Promise<AdminProject>
    updateProject(id: number, p: ProjectInput): Promise<AdminProject>
    deleteProject(id: number): Promise<void>
    reorderProjects(ids: number[]): Promise<void>
    posts(status?: PostStatus): Promise<{ items: AdminPost[] }>
    getPost(id: number): Promise<AdminPost>
    createPost(p: PostInput): Promise<AdminPost>
    updatePost(id: number, p: PostInput): Promise<AdminPost>
    deletePost(id: number): Promise<void>
    media(): Promise<{ items: MediaItem[] }>
    deleteMedia(id: number): Promise<void>
    audit(page?: number): Promise<Paged<AuditEntry>>
  }
}
```

- Server list responses for admin projects/posts/media are `{items:[...]}` — Tasks 7–9 must return that shape (projects public also `{items}`).
- `pick(l: Localized, lang: Language): string` → `l[lang] || l.en`.
- `queryClient` singleton (`retry: (n, err) => !(err instanceof ApiError && err.status < 500) && n < 2`, `staleTime: 30_000`).
- Query keys convention: `['projects']`, `['posts', params]`, `['post', slug]`, `['me']`, `['admin','projects']`, `['admin','posts', status]`, `['admin','post', id]`, `['admin','media']`, `['admin','audit', page]`, `['admin','sessions']`.

- [ ] **Step 1: Install**

```bash
cd app
npm i @tanstack/react-query react-markdown remark-gfm rehype-sanitize rehype-highlight highlight.js qrcode @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/qrcode
```

Add script `"test": "vitest"`.

- [ ] **Step 2: Vitest config** `app/vitest.config.ts`:

```ts
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'], include: ['src/**/*.test.{ts,tsx}'] },
});
```

`src/test/setup.ts`: `import '@testing-library/jest-dom/vitest';` plus `afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); })`.

- [ ] **Step 3: Failing tests.**

`src/lib/pick.test.ts`:

```ts
import { pick } from './pick';

describe('pick', () => {
  it('returns the requested language', () => {
    expect(pick({ en: 'Hello', th: 'สวัสดี' }, 'th')).toBe('สวัสดี');
  });
  it('falls back to English when Thai is empty', () => {
    expect(pick({ en: 'Hello', th: '' }, 'th')).toBe('Hello');
  });
});
```

`src/lib/api.test.ts`:

```ts
import { ApiError, request, setCsrfToken, upload } from './api';

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

describe('request', () => {
  it('unwraps the error envelope into ApiError', async () => {
    mockFetch(422, { error: { code: 'validation_failed', message: 'bad', fields: { slug: 'required' } } });
    const err = await request('POST', '/api/admin/projects', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'validation_failed', fields: { slug: 'required' } });
  });

  it('sends the CSRF header on mutations only, and JSON content-type', async () => {
    const spy = mockFetch(200, { ok: true });
    setCsrfToken('tok');
    await request('POST', '/api/x', { a: 1 });
    await request('GET', '/api/y');
    const [, postInit] = spy.mock.calls[0];
    const [, getInit] = spy.mock.calls[1];
    expect(new Headers(postInit!.headers).get('X-CSRF-Token')).toBe('tok');
    expect(new Headers(postInit!.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(getInit!.headers).get('X-CSRF-Token')).toBeNull();
    expect(postInit!.credentials).toBe('same-origin');
    setCsrfToken(null);
  });

  it('returns undefined for 204', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(request('DELETE', '/api/admin/projects/1')).resolves.toBeUndefined();
  });

  it('maps non-JSON failures to a generic ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
    await expect(request('GET', '/api/projects')).rejects.toMatchObject({ status: 502, code: 'http_502' });
  });

  it('upload sends multipart without JSON content-type', async () => {
    const spy = mockFetch(201, { id: 1, url: '/uploads/a.png' });
    setCsrfToken('tok');
    await upload(new File(['x'], 'a.png', { type: 'image/png' }));
    const init = spy.mock.calls[0][1]!;
    expect(init.body).toBeInstanceOf(FormData);
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('tok');
    setCsrfToken(null);
  });
});
```

- [ ] **Step 4: Run** `npm test -- --run` → FAIL. **Step 5: Implement** `pick.ts`, `api.ts` (module-level `let csrf: string | null`; network errors → `ApiError(0,'network','Network error')`), `types.ts`, `queryClient.ts`.

- [ ] **Step 6: Routing.**
  - `vite.config.ts`: `base: '/'` (BrowserRouter needs absolute asset paths for deep links); add `server.proxy` for `/api`, `/uploads`, `/rss.xml`, `/sitemap.xml` → `http://localhost:8080`.
  - `main.tsx`: wrap in `<QueryClientProvider client={queryClient}>` inside `<I18nProvider>`.
  - `App.tsx`:

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

const BlogListPage = lazy(() => import('./pages/BlogListPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

  - `Layout` switches from `children` to `<Outlet />`.
  - Until Tasks 13/19 land, create placeholder modules so the build passes: `src/pages/BlogListPage.tsx`, `src/pages/BlogPostPage.tsx`, `src/admin/AdminApp.tsx` each default-exporting a component rendering `<p className="font-mono">…</p>` with a translated "coming soon" string (`t.common.loading`). These are replaced in later tasks.
  - `HomePage.tsx`: the current inline `HomePage` from `App.tsx`, plus `useEffect` that scrolls to `location.hash` element after mount.
  - `NotFoundPage.tsx`: `bash: <path>: command not found` + link home, using translations.
  - Navbar: links become `<Link to="/#about">` etc. plus a `Blog` link to `/blog`; remove the Contact link; scroll-spy only active on `/`.
  - translations: add to both `en` and `th`: `nav.blog`, `common.{loading,error,retry,back,readMore,empty}`, `notFound.{title,body,home}`, `blog.{sectionLabel,title,latest,allPosts,filterAll,page,prev,next,publishedOn,empty,minRead}`. Thai values must be real Thai (e.g. `loading: 'กำลังโหลด...'`).

- [ ] **Step 7: Verify** `npm test -- --run` PASS, `npm run lint` (no new errors), `npm run build` OK. **Step 8: Commit** — `feat(app): browser router, typed API client, react-query and vitest`.

---
### Task 13: Terminal UI kit + Markdown renderer

**Files:**
- Create: `app/src/components/term/AsciiBox.tsx`, `Prompt.tsx`, `AsciiDivider.tsx`, `FigletTitle.tsx`, `Cursor.tsx`, `LoadingBar.tsx`, `ErrorLine.tsx`, `index.ts`, `term.test.tsx`
- Create: `app/src/components/Markdown.tsx`, `app/src/components/Markdown.test.tsx`
- Modify: `app/src/index.css` (term classes + highlight.js theme), `app/tailwind.config.js` (font stacks add `"IBM Plex Sans Thai"`)

**Interfaces:**
- Produces:
  - `<AsciiBox title?: string; as?: 'section'|'div'|'article'; className?: string; children>` — renders a CSS-drawn box (no fixed-width text art, so it is responsive): a `div.term-box` with a top border line containing `+--[ <title> ]` and box-drawing corners via `::before/::after`. Always `pointer-events-auto`. Title rendered in `text-neon-cyan`.
  - `<Prompt user='guest' host='prommin' path='~' command?: string; typing?: boolean>` → `guest@prommin:~$ <command>`; when `typing`, the command is revealed character-by-character (CSS steps animation, disabled under `prefers-reduced-motion`) followed by `<Cursor />`.
  - `<AsciiDivider char='-' label?: string>` — full-width row built from a repeating CSS background of the character (`content` via data attr), label centered.
  - `<FigletTitle text: string; art: string>` — `<h1 aria-label={text}><pre aria-hidden>art</pre></h1>`, `art` from `FIGLET_NAME` constant exported from `FigletTitle.tsx` (pre-generated "PROMMIN.L" in the figlet *Standard* font; include it literally). On screens < 640px render `text` in large mono instead of `art`.
  - `<Cursor />` — blinking block `█` (`animate-blink-cursor`).
  - `<LoadingBar label?: string>` — `loading... [####------]` animated with steps; `role="status"`.
  - `<ErrorLine error: unknown; onRetry?: () => void>` — `ERR: <code>: <message>` from `ApiError` (or generic), with `[retry]` button.
  - `<Markdown source: string; className?: string>` — `react-markdown` with `remarkGfm`, `rehypeSanitize` (default schema extended to allow `className` on `code`/`span` matching `^(language-|hljs)`), then `rehypeHighlight` (**after** sanitize so highlight classes survive); links open external hrefs with `target="_blank" rel="noopener noreferrer"`; images `loading="lazy"`; wrapper class `md-term` (headings prefixed by `#`-style markers via CSS, code blocks in `.term-window` look).

- [ ] **Step 1: Failing tests.**

`Markdown.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import Markdown from './Markdown';

describe('Markdown', () => {
  it('renders GFM tables and highlighted code', () => {
    const { container } = render(<Markdown source={'| a | b |\n|---|---|\n| 1 | 2 |\n\n```go\nfunc main() {}\n```'} />);
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('code.hljs, code[class*="language-go"]')).toBeInTheDocument();
  });

  it('strips scripts, event handlers and javascript: links', () => {
    const { container } = render(
      <Markdown source={'<script>window.pwned=1</script>\n\n<img src=x onerror="window.pwned=1">\n\n[click](javascript:alert(1))'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(screen.getByText('click').getAttribute('href') ?? '').not.toContain('javascript:');
  });

  it('opens external links safely', () => {
    render(<Markdown source={'[site](https://example.com)'} />);
    const a = screen.getByText('site');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
```

`term.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { AsciiBox, ErrorLine, FigletTitle, FIGLET_NAME } from './index';

it('AsciiBox shows its title and children', () => {
  render(<AsciiBox title="~/projects"><p>hi</p></AsciiBox>);
  expect(screen.getByText('~/projects')).toBeInTheDocument();
  expect(screen.getByText('hi')).toBeInTheDocument();
});

it('ErrorLine formats ApiError and retries', async () => {
  const retry = vi.fn();
  render(<ErrorLine error={new ApiError(404, 'not_found', 'Resource not found.')} onRetry={retry} />);
  expect(screen.getByText(/ERR: not_found: Resource not found\./)).toBeInTheDocument();
  screen.getByRole('button').click();
  expect(retry).toHaveBeenCalled();
});

it('FigletTitle keeps an accessible name', () => {
  render(<FigletTitle text="PROMMIN.L" art={FIGLET_NAME} />);
  expect(screen.getByRole('heading', { name: 'PROMMIN.L' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; CSS in `index.css` under a `/* ----- Terminal kit ----- */` divider: `.term-box`, `.term-box-title`, `.ascii-divider`, `.md-term` (+ `h1..h3`, `pre`, `code`, `blockquote`, `table`, `a` styles), `.hljs-*` token colors mapped to palette (keywords `#6C5CE7`, strings `#4AF626`, numbers `#FFD93D`, comments `#6B7A90`, titles `#00E5FF`). Copy-strings in components come from translations where user-facing (`common.retry`).
- [ ] **Step 4: Run** tests + lint + build → PASS. **Step 5: Commit** — `feat(app): terminal UI kit and sanitized markdown renderer`.

---

## Phase 3 — Admin Console

### Task 14: Admin shell, auth gate and login flow

**Files:**
- Create: `app/src/admin/AdminApp.tsx` (replace placeholder), `app/src/admin/AuthGate.tsx`, `app/src/admin/useMe.ts`, `app/src/admin/AdminLayout.tsx`, `app/src/admin/login/LoginPage.tsx`, `app/src/admin/login/TotpSetup.tsx`, `app/src/admin/login/RecoveryCodes.tsx`, `app/src/admin/login/LoginPage.test.tsx`, `app/src/admin/components/Field.tsx`
- Modify: `app/src/i18n/translations.ts` (`admin.*` keys in en + th)

**Interfaces:**
- Consumes: `api.auth.*`, `setCsrfToken`, `ApiError`, `queryClient`, term kit.
- Produces:
  - `useMe(): UseQueryResult<Me, ApiError>` — key `['me']`, `retry: false`; on success calls `setCsrfToken(me.csrfToken)`; on 401 `setCsrfToken(null)`.
  - `<AuthGate>`: loading → `<LoadingBar/>`; 401 → `<Navigate to="/admin/login" replace state={{ from: location }} />`; ok → `<Outlet/>`.
  - `AdminApp` routes (relative to `/admin`): `login` → `LoginPage`; inside `AuthGate` + `AdminLayout`: index → `<Navigate to="projects" replace/>`, `projects`, `projects/new`, `projects/:id`, `posts`, `posts/new`, `posts/:id`, `media`, `settings`, `audit`. Pages from later tasks: until they exist, route elements are lazy imports of placeholder components created in this task under the final file paths (each later task overwrites its file).
  - `<AdminLayout>`: full-height grid; sidebar nav items `[ projects ] [ posts ] [ media ] [ settings ] [ audit ]` (NavLink active = cyan inverse); top bar `admin@prommin:~/admin/<section>` + method badge (`via password|github`) + EN|TH toggle + `[logout]` (calls `api.auth.logout`, `queryClient.clear()`, navigate `/admin/login`); `<Outlet/>`; `document.title = 'admin — <section>'`. No 3D canvas. Mobile: sidebar collapses into a top horizontal scroll row.
  - `<Field label error? children>` — label + child + `ERR: <error>` line (`role="alert"`).
  - LoginPage state machine `type Step = 'password' | 'totp' | 'recovery' | 'setup' | 'codes'`:
    - `password`: username + password → `api.auth.login` → `next==='totp'` → `totp`, `'totp_setup'` → `setup`. Errors: `invalid_credentials` → translated message; `rate_limited` → translated message incl. "try again later".
    - `totp`: 6-digit input (`inputMode="numeric"`, `autoComplete="one-time-code"`, pattern `\d{6}`) → `api.auth.totpVerify` → success → `invalidate ['me']` → navigate to `location.state.from ?? '/admin'`. Link "use a recovery code" → `recovery` step (`api.auth.recovery`).
    - `setup`: on enter calls `api.auth.totpSetup()`; renders QR (`qrcode.toDataURL(otpauthUrl)` in an effect → `<img alt>`), the secret in groups of 4, then code input → `totpVerify` → response `recoveryCodes` → `codes` step.
    - `codes`: `<RecoveryCodes codes>` with copy + download (`recovery-codes.txt`) and a checkbox "I saved these codes" enabling `[continue]` → navigate `/admin`.
    - Query param `?error=github_not_linked` shows the translated error on the password step.
    - "Login with GitHub" button (an `<a href="/api/auth/github/start?mode=login">`) shown only when `api.auth.providers().github`.

- [ ] **Step 1: Failing test** `LoginPage.test.tsx` (mock the `api` module with `vi.mock('@/lib/api', …)` keeping the real `ApiError`; render inside `QueryClientProvider` + `I18nProvider` + `MemoryRouter initialEntries={['/admin/login']}` with routes `/admin/login` and `/admin` → `<p>dashboard</p>`; mock `qrcode` `toDataURL` → `Promise.resolve('data:image/png;base64,AAA')`):

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import LoginPage from './LoginPage';

const auth = vi.hoisted(() => ({
  providers: vi.fn(), login: vi.fn(), totpSetup: vi.fn(), totpVerify: vi.fn(), recovery: vi.fn(), me: vi.fn(),
}));
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { auth } };
});
vi.mock('qrcode', () => ({ default: { toDataURL: () => Promise.resolve('data:image/png;base64,AAA') } }));

function setup(entry = '/admin/login') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<p>dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auth.providers.mockResolvedValue({ github: true });
});

it('password then TOTP logs in', async () => {
  auth.login.mockResolvedValue({ next: 'totp' });
  auth.totpVerify.mockResolvedValue({});
  setup();
  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), 'very-long-password');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.type(await screen.findByLabelText(/code/i), '123456');
  await userEvent.click(screen.getByRole('button', { name: /verify/i }));
  expect(await screen.findByText('dashboard')).toBeInTheDocument();
  expect(auth.totpVerify).toHaveBeenCalledWith('123456');
});

it('first login walks through TOTP setup and recovery codes', async () => {
  auth.login.mockResolvedValue({ next: 'totp_setup' });
  auth.totpSetup.mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/x' });
  auth.totpVerify.mockResolvedValue({ recoveryCodes: ['abcd-efgh', 'jkmn-pqrs'] });
  setup();
  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), 'very-long-password');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
  expect(await screen.findByRole('img')).toHaveAttribute('src', 'data:image/png;base64,AAA');
  await userEvent.type(screen.getByLabelText(/code/i), '654321');
  await userEvent.click(screen.getByRole('button', { name: /verify/i }));
  expect(await screen.findByText('abcd-efgh')).toBeInTheDocument();
  const cont = screen.getByRole('button', { name: /continue/i });
  expect(cont).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(cont);
  expect(await screen.findByText('dashboard')).toBeInTheDocument();
});

it('shows server errors and the github_not_linked query error', async () => {
  const { ApiError } = await import('@/lib/api');
  auth.login.mockRejectedValue(new ApiError(401, 'invalid_credentials', 'x'));
  setup('/admin/login?error=github_not_linked');
  expect(await screen.findByText(/not linked/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', '/api/auth/github/start?mode=login');
  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid username or password/i);
});
```

(EN translations must therefore contain: labels `Username`, `Password`, `Code`; buttons `Login`, `Verify`, `Continue`; `Login with GitHub`; error texts `Invalid username or password.` and `This GitHub account is not linked to the admin account.`)

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** tests/lint/build → PASS. **Step 5: Commit** — `feat(admin): admin shell, auth gate and password/TOTP/GitHub login`.

---

### Task 15: Admin projects — list, reorder, editor, delete

**Files:**
- Create/overwrite: `app/src/admin/projects/ProjectsPage.tsx`, `app/src/admin/projects/ProjectEditor.tsx`, `app/src/admin/projects/ProjectEditor.test.tsx`, `app/src/admin/components/LangTabs.tsx`, `app/src/admin/components/TagsInput.tsx`, `app/src/admin/components/ConfirmDelete.tsx`
- Modify: `app/src/i18n/translations.ts`

**Interfaces:**
- Consumes: `api.admin.{projects,createProject,updateProject,deleteProject,reorderProjects}`, `Field`, types `AdminProject`, `ProjectInput`.
- Produces:
  - `<LangTabs value:'en'|'th' onChange>` — `[ EN ] [ TH ]` tab buttons (`role="tablist"`), TH tab shows `*` when the TH fields are empty.
  - `<TagsInput value:string[] onChange max=12>` — Enter or comma adds (trimmed, deduped, ≤32 chars), Backspace on empty removes last, chips with `[x]`.
  - `<ConfirmDelete slug onConfirm>` — button `[delete]` opening a Radix `AlertDialog` (`@/components/ui/alert-dialog`) that requires typing the slug exactly before `[confirm delete]` enables.
  - `applyServerErrors(err: unknown, setErrors: (f: Record<string,string>) => void): boolean` exported from `Field.tsx` — when `ApiError` with `fields`, sets them and returns true; `slug_taken` maps to `{slug: t.admin.errors.slugTaken}`.
  - ProjectsPage: table columns `#`, `slug`, `name`, `tags`, `status` (`[pub]`/`[hidden]`, `★` flagship), rows draggable via `@dnd-kit/sortable` with a `::` handle (keyboard sensor enabled); on drop → optimistic reorder + `reorderProjects(ids)`; error → toast + refetch. `[+ new project]` → `/admin/projects/new`.
  - ProjectEditor (`/admin/projects/new` and `/admin/projects/:id`): form state `ProjectInput`; LangTabs switch `nameEn/descEn` ↔ `nameTh/descTh`; slug auto-derived from `nameEn` on create until the user edits slug (`slugify`: lowercase, non-alnum → `-`, collapse, trim `-`, max 80); save → create/update → toast `saved` → invalidate `['admin','projects']` + `['projects']` → navigate list; ConfirmDelete on edit page.
  - `slugify(s: string): string` exported from `app/src/admin/slugify.ts` (with test) — reused by posts.

- [ ] **Step 1: Failing tests** `app/src/admin/slugify.test.ts`:

```ts
import { slugify } from './slugify';
it.each([
  ['Kanban Task Management', 'kanban-task-management'],
  ['  Hello,  World!! ', 'hello-world'],
  ['Next.js 16 + .NET 10', 'next-js-16-net-10'],
  ['ระบบ Kanban', 'kanban'],
  ['---', ''],
])('%s → %s', (input, out) => expect(slugify(input)).toBe(out));
it('caps at 80 chars without a trailing dash', () => {
  const s = slugify('a'.repeat(79) + ' b');
  expect(s.length).toBeLessThanOrEqual(80);
  expect(s.endsWith('-')).toBe(false);
});
```

`ProjectEditor.test.tsx` (mock `api.admin` like Task 14; render route `/admin/projects/new`):

```tsx
it('creates a project with an auto slug and shows field errors from the server', async () => {
  admin.createProject
    .mockRejectedValueOnce(new ApiError(422, 'validation_failed', 'x', { repoUrl: 'must be an http(s) URL' }))
    .mockResolvedValueOnce({ id: 1 });
  setup('/admin/projects/new');
  await userEvent.type(screen.getByLabelText(/^name/i), 'Flow Forge');
  expect(screen.getByLabelText(/slug/i)).toHaveValue('flow-forge');
  await userEvent.type(screen.getByLabelText(/repo url/i), 'ftp://x');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText(/must be an http\(s\) URL/)).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText(/repo url/i));
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  await waitFor(() => expect(admin.createProject).toHaveBeenCalledTimes(2));
  expect(admin.createProject.mock.calls[1][0]).toMatchObject({ slug: 'flow-forge', nameEn: 'Flow Forge', repoUrl: '' });
});

it('keeps a manually edited slug', async () => {
  setup('/admin/projects/new');
  await userEvent.type(screen.getByLabelText(/slug/i), 'custom');
  await userEvent.type(screen.getByLabelText(/^name/i), 'Other Name');
  expect(screen.getByLabelText(/slug/i)).toHaveValue('custom');
});
```

(Write the `setup`/mocks block exactly in the style of Task 14's test, with routes `/admin/projects/new` → `<ProjectEditor/>` and `/admin/projects` → `<p>list</p>`.)

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4:** tests/lint/build PASS. **Step 5: Commit** — `feat(admin): project management with drag reorder`.

---

### Task 16: Admin media library

**Files:**
- Create/overwrite: `app/src/admin/media/MediaPage.tsx`, `app/src/admin/media/useUpload.ts`, `app/src/admin/media/useUpload.test.tsx`
- Modify: `app/src/i18n/translations.ts`

**Interfaces:**
- Consumes: `upload(file)`, `api.admin.{media,deleteMedia}`.
- Produces: `useUpload(): { uploadFiles(files: File[]): Promise<MediaItem[]>; uploading: boolean }` — client-side pre-check (type in `image/png,image/jpeg,image/webp,image/gif`, size ≤ 5 MB → toast error and skip), uploads sequentially, invalidates `['admin','media']`. MediaPage: drop zone + file picker (`accept` same list), grid of thumbnails with `filename`, `w×h`, size; per item `[copy md]` → clipboard `![<originalName>](<url>)` + toast; `[delete]` → confirm dialog → `deleteMedia`.

- [ ] **Step 1: Failing test:**

```tsx
it('rejects non-images and oversize files before uploading', async () => {
  const up = vi.spyOn(apiModule, 'upload').mockResolvedValue({ id: 1, url: '/uploads/a.png' } as MediaItem);
  const { result } = renderHook(() => useUpload(), { wrapper });
  const ok = new File(['x'], 'a.png', { type: 'image/png' });
  const txt = new File(['x'], 'a.txt', { type: 'text/plain' });
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'b.png', { type: 'image/png' });
  let items: MediaItem[] = [];
  await act(async () => { items = await result.current.uploadFiles([ok, txt, big]); });
  expect(up).toHaveBeenCalledTimes(1);
  expect(items).toHaveLength(1);
});
```

(`import * as apiModule from '@/lib/api'`; `wrapper` = QueryClientProvider + I18nProvider.)

- [ ] **Step 2–4:** FAIL → implement → PASS (tests/lint/build). **Step 5: Commit** — `feat(admin): media library with upload and markdown copy`.

---

### Task 17: Admin posts — list, split-pane editor, image paste, autosave

**Files:**
- Create/overwrite: `app/src/admin/posts/PostsPage.tsx`, `app/src/admin/posts/PostEditor.tsx`, `app/src/admin/posts/useAutosave.ts`, `app/src/admin/posts/useAutosave.test.ts`, `app/src/admin/posts/PostEditor.test.tsx`, `app/src/admin/posts/insertAtCursor.ts`
- Modify: `app/src/i18n/translations.ts`

**Interfaces:**
- Consumes: `api.admin.{posts,getPost,createPost,updatePost,deletePost,media}`, `useUpload`, `Markdown`, `LangTabs`, `TagsInput`, `ConfirmDelete`, `Field`, `applyServerErrors`, `slugify`.
- Produces:
  - `useAutosave<T>(key: string, value: T, dirty: boolean, intervalMs = 5000): { restore: T | null; savedAt: number | null; discard(): void; clear(): void }` — on mount reads `localStorage[key]` (`{value, savedAt}`) and exposes it as `restore` if present; while `dirty`, writes every `intervalMs`; `clear()` removes the key (called after a successful save); `discard()` removes and hides `restore`. Key format: `draft:post:<id|new>`.
  - `insertAtCursor(textarea: HTMLTextAreaElement, text: string): string` — returns the new value with `text` inserted at the selection (replacing it).
  - PostsPage: status filter `[all] [draft] [published]`, table `updated`, `slug`, `title`, `status`, `tags`; `[+ new post]`.
  - PostEditor: fields `slug` (auto from `titleEn` on create until edited), LangTabs → `title*`, `excerpt*`, `body*` per language; tags; cover picker (select from `api.admin.media()` thumbnails or none); status toggle `[draft]/[published]`; split pane (≥ 1024px side-by-side, else tabs `[write] [preview]`) with `<textarea>` (mono, tab inserts two spaces) and live `<Markdown source>` preview; paste or drop of image files on the textarea → `uploadFiles` → insert `![name](url)` at cursor for each; dirty tracking vs. last loaded/saved value; `beforeunload` listener while dirty; `useBlocker` (react-router) when dirty → confirm dialog "discard changes?"; restore banner `draft from <time> found [restore] [discard]` when `restore` exists and differs from the loaded post; `Ctrl/Cmd+S` saves.
  - After save: `clear()` autosave, invalidate `['admin','posts']`, `['posts']`, `['post', slug]`; on create navigate to `/admin/posts/<id>` (replace).

- [ ] **Step 1: Failing tests.**

`useAutosave.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { useAutosave } from './useAutosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('saves while dirty and offers restore on the next mount', () => {
  const { rerender, unmount } = renderHook(({ v, d }) => useAutosave('draft:post:new', v, d), { initialProps: { v: { body: 'a' }, d: false } });
  act(() => vi.advanceTimersByTime(6000));
  expect(localStorage.getItem('draft:post:new')).toBeNull();
  rerender({ v: { body: 'abc' }, d: true });
  act(() => vi.advanceTimersByTime(5000));
  expect(JSON.parse(localStorage.getItem('draft:post:new')!).value).toEqual({ body: 'abc' });
  unmount();
  const next = renderHook(() => useAutosave('draft:post:new', { body: '' }, false));
  expect(next.result.current.restore).toEqual({ body: 'abc' });
  act(() => next.result.current.discard());
  expect(next.result.current.restore).toBeNull();
  expect(localStorage.getItem('draft:post:new')).toBeNull();
});

it('survives corrupted storage', () => {
  localStorage.setItem('draft:post:1', '{not json');
  const { result } = renderHook(() => useAutosave('draft:post:1', {}, false));
  expect(result.current.restore).toBeNull();
});
```

`PostEditor.test.tsx` (mocks as in Task 14/15; `upload` mocked to resolve `{url:'/uploads/abc.png'}`):

```tsx
it('pasting an image uploads it and inserts markdown at the cursor', async () => {
  setup('/admin/posts/new');
  const body = await screen.findByLabelText(/body/i);
  await userEvent.type(body, 'before ');
  const file = new File(['x'], 'shot.png', { type: 'image/png' });
  fireEvent.paste(body, { clipboardData: { files: [file], items: [], types: ['Files'] } });
  await waitFor(() => expect(body).toHaveValue('before ![shot.png](/uploads/abc.png)'));
});

it('preview renders the markdown live', async () => {
  setup('/admin/posts/new');
  await userEvent.type(await screen.findByLabelText(/body/i), '## Hello');
  expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument();
});

it('offers to restore an autosaved draft', async () => {
  localStorage.setItem('draft:post:new', JSON.stringify({ savedAt: Date.now(), value: { slug: 'x', titleEn: 'Recovered', titleTh: '', excerptEn: '', excerptTh: '', bodyEn: 'lost work', bodyTh: '', tags: [], coverMediaId: null, status: 'draft' } }));
  setup('/admin/posts/new');
  await userEvent.click(await screen.findByRole('button', { name: /restore/i }));
  expect(screen.getByLabelText(/body/i)).toHaveValue('lost work');
});
```

(jsdom has no `matchMedia` width → force the side-by-side layout in tests by rendering both panes when `window.matchMedia` is undefined.)

- [ ] **Step 2–4:** FAIL → implement → PASS (tests/lint/build). **Step 5: Commit** — `feat(admin): markdown post editor with image paste and autosave`.

---

### Task 18: Admin settings, audit log and command palette

**Files:**
- Create/overwrite: `app/src/admin/settings/SettingsPage.tsx`, `app/src/admin/audit/AuditPage.tsx`, `app/src/admin/CommandPalette.tsx`, `app/src/admin/CommandPalette.test.tsx`
- Modify: `app/src/admin/AdminLayout.tsx` (mount palette), `app/src/i18n/translations.ts`

**Interfaces:**
- Consumes: `useMe`, `api.auth.{sessions,revokeSession,logoutAll,regenerateRecovery,unlinkGitHub,providers}`, `api.admin.{audit,projects,posts}`, `RecoveryCodes`.
- Produces:
  - SettingsPage sections (each an `AsciiBox`): **account** (username, auth method); **two-factor** (enabled ✓, `[regenerate recovery codes]` → prompt TOTP code → show `RecoveryCodes`); **github** (`linked as @login` + `[unlink]` requiring TOTP code, or `[link github]` anchor `/api/auth/github/start?mode=link`; hidden when providers.github false; `?linked=1` → success toast once); **sessions** (table ip/agent/method/created/expires, current marked `*`, `[revoke]` per non-current row, `[logout everywhere]` → `logoutAll` → navigate login).
  - AuditPage: paginated table `time action entity id ip`, `[prev] [next]`.
  - `parseCommand(input: string, ctx: { projects: {id:number;slug:string}[]; posts: {id:number;slug:string}[] }): { to: string } | { action: 'logout' } | null` exported from `CommandPalette.tsx`:
    - `new post` → `/admin/posts/new`; `new project` → `/admin/projects/new`;
    - `edit <slug>` → project match first `/admin/projects/<id>`, else post `/admin/posts/<id>`, else null;
    - `goto <projects|posts|media|settings|audit>` (also bare section name) → `/admin/<section>`;
    - `logout` → `{action:'logout'}`; anything else null. Case-insensitive, trims.
  - `<CommandPalette>`: `Ctrl/Cmd+K` toggles a modal with an input prefixed `>`; suggestions list filtered by prefix (arrow keys + Enter); unknown → `ERR: command not found: <input>`.

- [ ] **Step 1: Failing test:**

```ts
import { parseCommand } from './CommandPalette';
const ctx = { projects: [{ id: 3, slug: 'kanban' }], posts: [{ id: 9, slug: 'hello' }, { id: 10, slug: 'kanban' }] };
it.each([
  ['new post', { to: '/admin/posts/new' }],
  ['  NEW Project ', { to: '/admin/projects/new' }],
  ['edit kanban', { to: '/admin/projects/3' }],
  ['edit hello', { to: '/admin/posts/9' }],
  ['goto media', { to: '/admin/media' }],
  ['audit', { to: '/admin/audit' }],
  ['logout', { action: 'logout' }],
  ['edit nope', null],
  ['rm -rf /', null],
])('%s', (input, expected) => expect(parseCommand(input, ctx)).toEqual(expected));
```

- [ ] **Step 2–4:** FAIL → implement → PASS (tests/lint/build). **Step 5: Commit** — `feat(admin): settings, audit log and command palette`.

---

## Phase 4 — Public site

### Task 19: API-driven projects, blog pages, latest posts

**Files:**
- Modify: `app/src/sections/ProjectsSection.tsx` (data from API; delete the hard-coded `projects` array and the `projects.items` translation keys afterwards), `app/src/i18n/translations.ts`
- Create/overwrite: `app/src/pages/BlogListPage.tsx`, `app/src/pages/BlogPostPage.tsx`, `app/src/sections/LatestPostsSection.tsx`, `app/src/pages/BlogPostPage.test.tsx`, `app/src/lib/useDocumentTitle.ts`
- Modify: `app/src/pages/HomePage.tsx` (append `<LatestPostsSection/>` after Stats)

**Interfaces:**
- Consumes: `api.projects/posts/post`, `pick`, term kit, `Markdown`, `LoadingBar`, `ErrorLine`.
- Produces:
  - `useDocumentTitle(title: string)` — sets `document.title` (`<title> — Prommin L.`; home: `Prommin L. — Full-Stack Developer`).
  - ProjectsSection keeps its current carousel/mobile layout and card design for now (Task 20 restyles); cards read `pick(p.name, lang)`, `pick(p.description, lang)`, `p.tags`, `p.metric`, `p.repoUrl`, `p.flagship`; loading → `<LoadingBar/>`; error → `<ErrorLine onRetry={refetch}/>`; empty → `t.common.empty`.
  - BlogListPage `/blog`: header `<Prompt command="ls -la ~/blog" />`; tag chips from the union of tags on the current page + `[all]` (tag in `?tag=`); rows `YYYY-MM-DD  <title>  [tags]` linking to `/blog/<slug>`, excerpt dimmed under; pagination `?page=` with `[prev] [next]`, 10 per page.
  - BlogPostPage `/blog/:slug`: `<Prompt command={`cat ~/blog/${slug}.md`}/>`, cover image, title (h1), date (`toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB')`), tags, `<Markdown source={pick(post.body, lang)}/>`, estimated read time (`ceil(words/200)` min), `[← back]` to `/blog`; 404 ApiError → the NotFound content; when TH requested but `body.th` empty, show a small note `t.blog.notTranslated` above the EN body.
  - LatestPostsSection: 3 newest posts (`api.posts({perPage:3})`) as `AsciiBox title="~/blog"`, `[all posts →]`; hidden entirely when there are 0 posts.

- [ ] **Step 1: Failing test** `BlogPostPage.test.tsx`:

```tsx
it('falls back to English with a note when Thai is missing', async () => {
  vi.spyOn(apiModule.api, 'post').mockResolvedValue({
    slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, body: { en: '## Body EN', th: '' },
    tags: ['go'], coverUrl: '', publishedAt: '2026-10-01T00:00:00Z',
  });
  renderAt('/blog/hello', 'th');
  expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Body EN' })).toBeInTheDocument();
  expect(screen.getByText(/ยังไม่มีฉบับภาษาไทย/)).toBeInTheDocument();
});

it('shows not-found for unknown slugs', async () => {
  vi.spyOn(apiModule.api, 'post').mockRejectedValue(new apiModule.ApiError(404, 'not_found', 'nope'));
  renderAt('/blog/missing', 'en');
  expect(await screen.findByText(/command not found/i)).toBeInTheDocument();
});
```

(`renderAt(path, lang)` renders `<BlogPostPage/>` under `Route path="/blog/:slug"` with providers and calls `setLang` via a tiny `SetLang` helper component using `useI18n`. TH `blog.notTranslated` = `'บทความนี้ยังไม่มีฉบับภาษาไทย — แสดงฉบับภาษาอังกฤษแทน'`; NotFound EN body contains `command not found`.)

- [ ] **Step 2–4:** FAIL → implement → PASS (tests/lint/build). Manually: run `cd server && PUBLIC_URL=http://localhost:3000 SESSION_SECRET=$(openssl rand -base64 48) TOTP_ENC_KEY=$(openssl rand -base64 32) ADMIN_USERNAME=admin ADMIN_PASSWORD=change-me-please COOKIE_SECURE=false DATA_DIR=$(mktemp -d) go run ./cmd/server` and `cd app && npm run dev`; `/` shows the 11 seeded projects. **Step 5: Commit** — `feat(app): API-driven projects and bilingual blog pages`.

---

### Task 20: Terminal redesign of the public site

**Files:**
- Modify: `app/src/sections/{HeroSection,AboutSection,ProjectsSection,SkillsSection,StatsSection,LatestPostsSection}.tsx`, `app/src/components/{Navbar,Footer,Layout}.tsx`, `app/src/pages/{BlogListPage,BlogPostPage,NotFoundPage}.tsx` (visual only), `app/src/index.css`, `app/src/i18n/translations.ts`
- Create: `app/src/sections/sections.test.tsx`

**Interfaces:**
- Consumes: term kit (`AsciiBox`, `Prompt`, `AsciiDivider`, `FigletTitle`, `FIGLET_NAME`, `Cursor`).
- Produces (visual contract):
  - **Navbar**: one-line terminal tab bar `~/prommin-l $` + links rendered as `[ about ]  [ projects ]  [ skills ]  [ blog ]` (active = inverse cyan), right side `EN|TH` and `[3d:on]/[3d:off]` toggle (existing `is3DEnabled` prop). Mobile: `[ menu ]` opens full-screen overlay listing the same links as `> about` lines.
  - **Hero**: `FigletTitle` in neon cyan with subtle text-shadow glow; below, `<Prompt command="whoami" typing/>` then tagline; `<Prompt command="cat status.txt"/>` → status line; CTAs as `[ view projects ]` (`.btn-neon`) and `[ read the blog ]` (`.btn-neon-outline`); stats as a 3-column ASCII table (`+-----+` borders via CSS). Profile picture rendered inside an `AsciiBox title="profile.png"` with CSS `image-rendering: pixelated`, grayscale + cyan tint, and a scanline overlay (`repeating-linear-gradient`) — no new image processing.
  - **About**: `AsciiBox title="~/about/README.md"` with bio paragraphs + `quick_facts.yaml` block in a second box.
  - **Projects**: each card is an `AsciiBox title={slug}` with `name`, description, `tags` as `[tag]` chips, metric line `>> metric`, flagship badge `[★ flagship]`, repo link `[ source ↗ ]`. Keep the desktop carousel + mobile stack logic.
  - **Skills**: `AsciiBox title="~/skills"` per category, items as a tree: `├── React` / `└── Go`.
  - **Stats/focus**: `AsciiBox` per focus area with an ASCII progress bar `[##########----]` (width from existing data, or fixed if none) — drop the mouse-tilt effect.
  - **Footer**: `AsciiDivider`, `guest@prommin:~$ exit` + socials as `[ github ]  [ linkedin ]  [ email ]`, `rss` link `/rss.xml`.
  - Section spacing: each section `py-20`, wrapper `pointer-events-none`, boxes `pointer-events-auto` (contract unchanged).
  - Remove now-unused styles from `index.css` only if no references remain (`grep` before deleting).

- [ ] **Step 1: Failing smoke test** `sections.test.tsx` — renders `HomePage` with `api.projects` mocked (2 projects) and `api.posts` mocked (0 posts) inside providers + MemoryRouter; asserts: heading `PROMMIN.L` exists; texts `whoami`, `~/about/README.md`, `~/skills` exist; a project box titled with the first slug exists; `[ source ↗ ]` link points to its `repoUrl`; the latest-posts box is absent; switching to TH (click `TH`) changes a known About string to its Thai value.
- [ ] **Step 2–4:** FAIL → implement → PASS (tests/lint/build). Visual check: `npm run dev` with the Go server running; screenshot desktop 1440×900 and mobile 390×844 with Playwright MCP or Chrome DevTools MCP; fix overflow/scroll issues (no horizontal page scroll on mobile). **Step 5: Commit** — `feat(app): ASCII terminal redesign of public sections`.

---

## Phase 5 — ASCII 3D background

### Task 21: ASCII-only animated background (3D removed) — revised per user request

> User direction change (2026-10-09): "เอา 3D ข้างหลังออก ใช้ ascii เท่านั้น" — remove the 3D background entirely; ASCII only. Spec §4.2 revised.

**Files:**
- Delete: `app/src/sandbox/` (whole directory), dependencies `three`, `@react-three/fiber`, `@react-three/drei` (and `@types/three` if present) via `npm uninstall`; also uninstall unused `gsap`, `@gsap/react`.
- Create: `app/src/background/asciiMath.ts`, `asciiMath.test.ts`, `glyphAtlas.ts`, `shader.ts`, `gl.ts`, `trail.ts`, `usePointerField.ts`, `AsciiBackground.tsx`, `StaticAsciiBackdrop.tsx`, `useFxEnabled.ts`, `useFxEnabled.test.ts`
- Modify: `app/src/components/Layout.tsx`, `app/src/components/Navbar.tsx` (toggle → `[fx:on]/[fx:off]`), `app/src/i18n/translations.ts`, any test that mocks the sandbox (e.g. `src/admin/posts/PostEditor.test.tsx` if it references it)

**Interfaces:**
- `asciiMath.ts` (pure, mirrored exactly in GLSL):
  - `RAMP = ' .:-=+*#%@'`, `SCRAMBLE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#%&@'`
  - `luminance(r,g,b)` (0.2126/0.7152/0.0722), `rampIndex(lum, len = RAMP.length)` = `min(len-1, floor(clamp01(lum)*len))`
  - `falloff(dist, radius)` = `1 - smoothstep(0, radius, dist)`; `hash21(x,y)` = `fract(sin(x*127.1 + y*311.7)*43758.5453)`
  - `cellOf(px, py, cell)` → `[floor(px/cell), floor(py/cell)]`; `scrambleActive(strength, cx, cy, tick)` = `hash21(cx + tick*7, cy + tick*13) < strength`
- `gl.ts`: `createProgram(gl, vs, fs)`, `fullscreenQuad(gl)` (one VBO, two triangles), `createTarget(gl, w, h)` (RGBA half-float if `EXT_color_buffer_half_float`/WebGL2 float support, else RGBA8).
- `glyphAtlas.ts`: `createGlyphAtlas(gl, chars, cellPx = 32): { texture: WebGLTexture; count: number }` — one row, white glyphs, `"JetBrains Mono", monospace`, NEAREST.
- `shader.ts`: `VERT`, `FRAG_ASCII`, `FRAG_TRAIL` strings. FRAG_ASCII uniforms: `uRamp, uScramble, uTrail` (samplers), `uRampCount, uScrambleCount, uCell, uTime, uScrambleRadius`, `uResolution, uMouse` (device px, bottom-left origin; `(-1e4,-1e4)` when absent), `uBg, uDim, uMid, uHot` (vec3). Per pixel: `cell = floor(gl_FragCoord.xy/uCell)`; `n = valueNoise(cell*0.07 + vec2(uTime*0.04, uTime*0.025))`; streams: `stream = step(0.985, hash21(vec2(cell.x, 0.))) * fract(-uTime*0.15*(0.5+hash21(vec2(cell.x,1.))) + cell.y*0.02)` (sparse falling columns); `lum = 0.06 + 0.24*n + 0.5*stream*stream`; glyph = ramp[rampIndex(lum)]; colour = `mix(uDim, uMid, n)` (+ `uHot*stream*0.6`); scramble: `s = max(falloff(distance(cellCenterPx, uMouse), uScrambleRadius), texture(uTrail, cellCenterUV).r)`; `tick = floor(uTime*20.)`; if `hash21(cell + tick*vec2(7.,13.)) < s` → scramble glyph `floor(hash21(cell.yx + tick)*uScrambleCount)`, colour `mix(colour, uHot, 0.85)`, lum boost; out = `mix(uBg, colour, mask)`. Palette: `uBg #05080D`, `uDim #1E2A38`, `uMid #2B4A5E`, `uHot #00E5FF`.
- `trail.ts`: `createTrail(gl, size = 256)` → `{ texture(): WebGLTexture; update(mouseUV: [number,number] | null, prevUV, dt): void; dispose(): void }` — ping-pong; `prev * pow(0.9202, dt*60) + splat` (Gaussian radius 0.04 UV, up to 8 samples along prev→current so fast drags stay continuous).
- `usePointerField()` → ref `{ x, y, px, py, active, t }` from window `pointermove`/`pointerdown`/`pointerleave` (passive, CSS px), inactive after 2 s idle; touch counts.
- `<AsciiBackground cell?: number />` — fixed `inset-0 z-0`, `aria-hidden`, `pointer-events-none`; canvas sized to viewport × min(devicePixelRatio, 1.5); resize observer; RAF loop capped at 60 fps, stops when `document.hidden`; on WebGL failure or context loss renders `<StaticAsciiBackdrop/>`; disposes on unmount. No `Math.random()` in render.
- `<StaticAsciiBackdrop/>` — fixed `<pre aria-hidden>` static ASCII field (~160×50 chars generated deterministically with `hash21` at module load, not per render), `text-hud-border`, overflow hidden.
- `useFxEnabled(): [enabled: boolean, toggle: () => void]` — localStorage key `fx-enabled` (default true; try/catch), false when `prefers-reduced-motion: reduce`.
- Layout: `fx ? <AsciiBackground cell={isMobile ? 10 : 8}/> : <StaticAsciiBackdrop/>`; Navbar shows `[fx:on]`/`[fx:off]` (translated aria-label).

- [ ] **Step 1: Failing tests.** `asciiMath.test.ts` exactly as below, plus `useFxEnabled.test.ts` (default true; toggle persists `fx-enabled=false`; corrupted/unavailable storage → default; reduced-motion media query → false).

```ts
import { RAMP, SCRAMBLE, cellOf, falloff, hash21, luminance, rampIndex, scrambleActive } from './asciiMath';

describe('asciiMath', () => {
  it('maps luminance onto the ramp ends', () => {
    expect(RAMP[rampIndex(0)]).toBe(' ');
    expect(RAMP[rampIndex(1)]).toBe('@');
    expect(rampIndex(-3)).toBe(0);
    expect(rampIndex(9)).toBe(RAMP.length - 1);
  });
  it('luminance weights green highest', () => {
    expect(luminance(0, 1, 0)).toBeGreaterThan(luminance(1, 0, 0));
    expect(luminance(1, 1, 1)).toBeCloseTo(1, 5);
  });
  it('falloff is 1 at the cursor and 0 beyond the radius', () => {
    expect(falloff(0, 120)).toBe(1);
    expect(falloff(120, 120)).toBe(0);
    expect(falloff(200, 120)).toBe(0);
    const mid = falloff(60, 120);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
  it('hash21 is deterministic and in [0,1)', () => {
    for (let i = 0; i < 100; i++) {
      const h = hash21(i * 3.1, i * 7.7);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(hash21(i * 3.1, i * 7.7)).toBe(h);
    }
  });
  it('cellOf buckets pixels', () => {
    expect(cellOf(15, 16, 8)).toEqual([1, 2]);
  });
  it('scramble probability follows strength', () => {
    let on = 0;
    for (let x = 0; x < 50; x++) for (let y = 0; y < 50; y++) if (scrambleActive(0.3, x, y, 4)) on++;
    expect(on / 2500).toBeGreaterThan(0.2);
    expect(on / 2500).toBeLessThan(0.4);
    expect(scrambleActive(0, 1, 1, 1)).toBe(false);
  });
  it('scramble set has no whitespace', () => {
    expect(SCRAMBLE).not.toContain(' ');
  });
});
```

- [ ] **Step 2–3:** FAIL → implement; delete `src/sandbox/`, uninstall 3D + gsap deps, wire Layout/Navbar, translations (en+th).
- [ ] **Step 4: Verify** tests/lint/build PASS; confirm the built JS no longer contains three.js (`grep -l "WebGLRenderer" dist/assets/*.js` → nothing) and report the main/initial chunk sizes. Run the Go server + `npm run dev` and use Playwright MCP: at 1440×900 the background shows ASCII glyphs; moving the mouse scrambles glyphs within ~120 px; a drag leaves a fading trail; buttons/links in panels remain clickable (background has pointer-events none); console has no WebGL errors; `[fx:off]` shows the static backdrop and persists across reload; emulate `prefers-reduced-motion: reduce` → static backdrop, no canvas. Screenshots desktop + 390×844 into the SDD workspace `screens/`. Measure FPS roughly (performance trace or rAF counter) — target ≥ 50 fps desktop.
- [ ] **Step 5: Commit** — `feat(background): ASCII-only animated background with cursor scramble; remove 3D sandbox`.

---

## Phase 5b — User feedback round (2026-10-09): Linux-terminal colours, interactive images, layered background

> User: "เบื้องต้นโอเคนะ แต่พวกสี กับการ Interacting กับรูปภาพฉันไม่มี พื้นหลังก็ไม่ค่อยมีมิติ แบนๆ ทำให้มันมีอะไรสักหน่อย หรือเพิ่มเลเยอร์ ใส่ลูกเล่นเข้าไปอีกนิด / พวกสีธีม ใส่สีสไตล์ Linux Terminal"

### Task 21b: Linux-terminal (Tango ANSI) colour theme

**Palette (GNOME Terminal / Tango — exact values):**

| token | normal | bright |
|---|---|---|
| black | `#2E3436` | `#555753` |
| red | `#CC0000` | `#EF2929` |
| green | `#4E9A06` | `#8AE234` |
| yellow | `#C4A000` | `#FCE94F` |
| blue | `#3465A4` | `#729FCF` |
| magenta | `#75507B` | `#AD7FA8` |
| cyan | `#06989A` | `#34E2E2` |
| white | `#D3D7CF` | `#EEEEEC` |

Terminal background `#0C0C0C`, surface `#141414` (panels at ~85% opacity over the field), foreground `#D3D7CF`, dim `#8A8F8A` (≥ 4.5:1 on bg), border `#2E3436`.

**Files:** `app/tailwind.config.js`, `app/src/index.css` (CSS vars + hljs theme), every component using the old palette tokens (grep `neon-cyan|terminal-green|hud-purple|hud-border|text-dim|gold|hud-red|hud-amber|#00E5FF|#4AF626|#6C5CE7|#05080D|#0B1118|#1E2A38|#6B7A90|#FFD93D`), `app/src/background/*` palette uniforms (temporary mapping only; Task 21c redesigns), AGENTS.md palette note left to Task 22.

**Interfaces:**
- Tailwind colors `ansi.{black,red,green,yellow,blue,magenta,cyan,white}` and `ansi.bright.{…}` (e.g. `text-ansi-bright-green`), plus semantic tokens remapped: `bg #0C0C0C`, `surface #141414`, `text #D3D7CF`, `text-dim #8A8F8A`, `hud-border #2E3436`, `accent` = bright cyan `#34E2E2`, `prompt-user` = bright green `#8AE234`, `prompt-path` = bright blue `#729FCF`, `link` = bright blue, `warn` = bright yellow, `danger` = bright red, `tag` = bright magenta.
- Remove the old token names after migration (no aliases left), keep `index.css` vars and tailwind in sync.
- Prompt component renders `guest@prommin` in bold bright green, `:` white, `~/path` bright blue, `$` white — exactly bash's default Ubuntu PS1 colours.
- Usage guide: headings/titles white bold; box titles bright cyan; tags bright magenta `[tag]`; metrics/dates bright yellow; flagship badge yellow; errors `ERR:` bright red; success/`online` bright green; links bright blue underline on hover; buttons: primary = bright green bg + black text, outline = green border; selection colour bright blue bg.
- hljs: keywords magenta, strings green, numbers yellow, comments dim italic, titles/functions blue, built-ins cyan, attr yellow.
- Admin console uses the same tokens.

- [ ] Steps: grep all old tokens → migrate → update tests that assert colours (if any) → `npm test -- --run && npm run lint && npm run build` → Playwright screenshots (home desktop/mobile EN+TH, blog post with code block, admin login + projects) into `screens/t21b-*.png` → commit `feat(theme): Linux terminal (Tango ANSI) colour palette`.

### Task 21c: Layered depth background

**Design:** keep one raw-WebGL pass (no new deps) but composite **three ASCII layers** + post effects in `FRAG_ASCII` (or a second small post pass):
- **Far layer** — small cells (6×11 CSS px), low brightness (`#2E3436`→`#555753`), slow noise drift, parallax factor 0.15.
- **Mid layer** — base cells (8×14), noise field + falling rain columns (~3.5% of columns, column choice from the integer column index with a well-conditioned hash), ANSI green/cyan tints, parallax 0.35.
- **Near layer** — large cells (14×24), very sparse bright glyphs (bright cyan/green/magenta/yellow, < 1% of cells), slow float + flicker, parallax 0.7, slight blur-free glow by brightness.
- **Parallax inputs:** smoothed mouse offset (−1..1 from viewport centre, eased) and scroll (`window.scrollY`, eased) → per-layer UV offset; layers composited back-to-front (near over mid over far by glyph mask).
- **Scramble** applies to mid + near layers around the cursor and along the drag trail (unchanged behaviour), colours cycle through ANSI bright colours.
- **CRT post:** subtle scanlines (every 2 device px, 6% darkening), vignette (radial, 35% at corners), slight phosphor bloom approximation (add 0.15 × brightness of neighbour cell), very slow screen flicker (±2%). All disabled when `fx` is off.
- **Readability:** content panels keep `surface` at ~85% opacity with a 1 px `#2E3436` border; verify body text contrast.
- **Budget:** ≥ 50 fps at 1920×1080 desktop; mobile drops the near layer and bloom.
- Update `asciiMath.ts` mirrors + tests for any new pure helpers (parallax offset, layer selection hash). Keep `?asciiT` / `asciiMouse` + add `asciiScroll=<px>` for deterministic screenshots.

- [ ] Steps: tests for new helpers (RED) → shader/compositor → screenshots `asciiT` 0/1500/3000 at 1440×900 + 1920×1080 + mouse/scroll variants into `screens/t21c-*.png`, plus a short FPS measurement → commit `feat(background): layered parallax ASCII field with CRT post effects`.

### Task 21d: Interactive ASCII images

**Component** `app/src/components/AsciiImage.tsx` (+ `asciiImage.ts` pure helpers + tests):
- Props `{ src: string; alt: string; cols?: number (default 64); className?: string }`.
- Loads the image (same-origin `/uploads/*`, `/profile.png`), draws to an offscreen canvas at `cols × rows` with **cell aspect correction** (`rows = round(cols * h/w * 0.5)`), computes per-cell luminance (sRGB weights) and colour; renders to a visible `<canvas>` with glyphs from the 70-level Bourke ramp, each glyph in its sampled colour quantised to the nearest **Tango ANSI** colour (bright variants for lum > 0.55) — i.e. a "terminal-coloured" ASCII portrait.
- **Interaction:** pointer hover → (a) scramble ripple: cells within radius 6 cells cycle random glyphs for ~400 ms, (b) **reveal lens**: within radius 5 cells the real image pixels show through (draw the source image clipped to a circle). Click/Enter toggles full photo ↔ ASCII with a 300 ms dissolve (cells flip in random order using a seeded hash). Touch: tap toggles.
- Accessibility: wrapper `role="img"` with `aria-label={alt}`; toggle is a `<button aria-pressed>` with translated label (en+th); `prefers-reduced-motion` → no ripple/dissolve, instant toggle.
- Rendering budget: redraw only on interaction (no continuous RAF when idle).
- Pure helpers in `asciiImage.ts`: `gridSize(w,h,cols)`, `nearestAnsi(r,g,b): {hex, bright}`, `bourkeIndex(lum)`, `cellsInRadius(cx,cy,r,cols,rows)`; unit tests.
- Use it for: hero profile (`/profile.png`) inside the `profile.png` AsciiBox; blog post cover; blog list rows show a tiny 24-col ASCII thumb when a cover exists.

- [ ] Steps: helper tests (RED) → component + tests (jsdom: renders role=img with label; toggle button switches aria-pressed; reduced-motion path) → integrate → screenshots (idle, hover lens, toggled photo) `screens/t21d-*.png` → commit `feat(app): interactive terminal-coloured ASCII images`.

---

## Phase 6 — End-to-end and docs

### Task 22: Playwright E2E, docs, final verification

**Files:**
- Create: `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/admin-blog.spec.ts`, `e2e/global-setup.ts`
- Modify: `AGENTS.md`, `.gitignore` (`e2e/node_modules`, `e2e/test-results`, `e2e/.data`), `.github/workflows/ci.yml` (add `e2e` job after `web`+`server`)

**Interfaces:**
- Consumes: built frontend copied into `server/internal/web/dist`, `go build`, env vars.
- Produces: `cd e2e && npm ci && npx playwright install chromium && npm test`.

- [ ] **Step 1:** `e2e/package.json` with devDeps `@playwright/test`, `otpauth` (TOTP generation), script `"test": "playwright test"`.
- [ ] **Step 2:** `global-setup.ts`: `npm --prefix ../app run build`, copy `../app/dist/*` → `../server/internal/web/dist/`, `go build -o .data/server ../server/cmd/server` (cwd `../server`), returns nothing. `playwright.config.ts`: `globalSetup`, `webServer: { command: './.data/server', port: 8090, env: { ADDR: ':8090', PUBLIC_URL: 'http://localhost:8090', DATA_DIR: '<abs>/.data/run-<timestamp>', ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'e2e-password-123', SESSION_SECRET: 'x'.repeat(48), TOTP_ENC_KEY: Buffer.alloc(32, 7).toString('base64'), COOKIE_SECURE: 'false' } }`, `use: { baseURL: 'http://localhost:8090' }`, one chromium project, `reducedMotion: 'reduce'` (keeps tests off WebGL).
- [ ] **Step 3:** `admin-blog.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import * as OTPAuth from 'otpauth';

test('admin sets up TOTP, publishes a post, and it appears on /blog', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Login' }).click();

  const secretText = await page.getByTestId('totp-secret').innerText();
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretText.replace(/\s/g, '')) });
  await page.getByLabel('Code').fill(totp.generate());
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.goto('/admin/posts/new');
  await page.getByLabel(/^Title/).fill('E2E Hello World');
  await page.getByLabel(/^Body/).fill('## It works\n\nPublished from Playwright.');
  await page.getByRole('button', { name: /published/i }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/saved/i)).toBeVisible();

  await page.goto('/blog');
  await page.getByRole('link', { name: /E2E Hello World/ }).click();
  await expect(page.getByRole('heading', { name: 'It works' })).toBeVisible();
  await expect(page).toHaveTitle(/E2E Hello World/);

  const html = await (await page.request.get('/blog/e2e-hello-world')).text();
  expect(html).toContain('og:title" content="E2E Hello World — Prommin L."');
});

test('seeded projects render on the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('kanban', { exact: true }).first()).toBeVisible();
});
```

(`TotpSetup` must render the secret with `data-testid="totp-secret"` — add it in this task if Task 14 didn't.)

- [ ] **Step 4:** Run the E2E suite → PASS (fix app bugs found; each fix gets a unit test where practical).
- [ ] **Step 5: Docs.** Rewrite `AGENTS.md` to the new architecture: repo layout (`app/`, `server/`, `deploy/`, `e2e/`), commands (Go + npm + e2e + docker), backend packages and conventions (error envelope, camelCase, migrations, testutil), auth model (password+TOTP, GitHub linking, CSRF, rate limit), API table, frontend changes (BrowserRouter, api client, react-query, admin, term kit, ASCII shader with scramble, StaticAsciiBackdrop), i18n rule, testing (vitest, go test, playwright), deployment (Docker + Caddy, env, backups). Remove stale statements (HashRouter, contact form, "no backend", lint count if changed — re-run `npm run lint` and state the real number).
- [ ] **Step 6: Final verification** — run and paste outputs into the report: `cd server && go vet ./... && go test -race ./...`; `cd app && npm run lint; npm test -- --run; npm run build`; `cd e2e && npm test`; `docker build -t petanque-site:final .` + run container + `curl /healthz`, `/api/projects`, `/rss.xml`.
- [ ] **Step 7: Commit** — `test: playwright e2e for admin blog flow; docs: update AGENTS.md`.
