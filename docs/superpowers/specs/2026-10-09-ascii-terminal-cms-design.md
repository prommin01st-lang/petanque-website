# ASCII Terminal Portfolio + Admin CMS — Design

Date: 2026-10-09 · Status: approved in brainstorming · Branch: `feature/ascii-terminal-cms`

## 1. Goal

Redesign the portfolio (`app/`) into an **ASCII-art terminal website** and add a
self-hosted **Go + SQLite backend** with an **Admin Console** to create / edit /
delete projects and manage a bilingual blog. Deployed with Docker on the owner's
own server and domain.

### Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Data store | Own backend, Docker, own server + domain |
| Backend stack | **Go + SQLite** |
| Architecture | **A** — one Go binary serves `/api/*` + the built SPA (`go:embed`); Caddy in front for TLS |
| Visual style | ~~3D scene rendered as ASCII~~ → **revised: no 3D; pure ASCII animated background** (raw WebGL shader) |
| Background | Generative ASCII noise field behind the scene; **Scramble** effect around the cursor + fading drag trail |
| Blog | Markdown + image upload + separate EN/TH content (TH optional → falls back to EN), tags, draft/published |
| Admin auth | Single admin. **Password + mandatory TOTP** primary; **GitHub OAuth** secondary, only after the admin links their GitHub account while logged in. GitHub login does **not** re-prompt TOTP. |

### Scope

In scope: projects + blog management. About / Skills / Stats copy stays static in
`app/src/i18n/translations.ts`. Out of scope: multiple admin users, comments,
contact form backend, full-text search.

## 2. Repository layout

```
app/                         React/Vite frontend (existing)
server/                      Go module  github.com/prommin01st-lang/petanque-website/server
  cmd/server/main.go         entrypoint (config, migrate, seed, http.ListenAndServe)
  internal/config/           env parsing + validation
  internal/store/            sqlite open (WAL, foreign_keys), migrations runner, tx helper
  internal/store/migrations/ 0001_init.sql … (embedded)
  internal/auth/             password, totp, recovery codes, sessions, github oauth, rate limit, middleware
  internal/projects/         repo + handlers
  internal/posts/            repo + handlers
  internal/media/            upload validation, storage, handlers
  internal/audit/            audit log writer + handler
  internal/httpx/            JSON helpers, error envelope, router assembly, CSRF, security headers
  internal/web/              SPA serving (embed fs), meta-tag injection, rss.xml, sitemap.xml
  internal/seed/             projects.json (11 existing projects, EN+TH) + seeding
deploy/
  Caddyfile
  docker-compose.yml
  .env.example
  backup.sh
Dockerfile                   multi-stage: node build → go build (embeds app/dist) → distroless
.github/workflows/ci.yml     lint + test + build; push image to GHCR on main
```

The Go module embeds the frontend build via a directory `server/internal/web/dist`
populated at build time (Docker copies `app/dist` there; local dev uses the Vite
proxy instead and an empty placeholder `dist/.keep`).

## 3. Backend

### 3.1 Libraries

- Router: `github.com/go-chi/chi/v5`
- SQLite: `modernc.org/sqlite` (pure Go, no cgo → static binary, distroless)
- TOTP: `github.com/pquerna/otp`
- Passwords: `golang.org/x/crypto/bcrypt` (cost 12)
- GitHub OAuth: `golang.org/x/oauth2` + `golang.org/x/oauth2/github`
- Everything else stdlib (`log/slog`, `net/http`, `crypto/*`, `embed`, `image`).

### 3.2 Configuration (env)

| Var | Required | Notes |
|---|---|---|
| `DOMAIN` | yes (compose) | used by Caddy and for absolute URLs (`PUBLIC_URL=https://$DOMAIN`) |
| `PUBLIC_URL` | yes | e.g. `https://prommin.dev`; OAuth callback + RSS/OG URLs |
| `DATA_DIR` | no | default `/data`; holds `app.db` and `uploads/` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | first run | bootstraps the admin if the table is empty; ignored afterwards |
| `SESSION_SECRET` | yes | ≥32 bytes; HMAC key for OAuth state cookie |
| `TOTP_ENC_KEY` | yes | 32 bytes base64; AES-256-GCM key for TOTP secret at rest |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | no | GitHub login disabled when empty |
| `COOKIE_SECURE` | no | default `true`; `false` for local http dev |
| `ADDR` | no | default `:8080` |

Startup fails fast with a clear message when required vars are missing or malformed.

### 3.3 Schema (`0001_init.sql`)

```sql
CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret_enc BLOB,            -- AES-GCM(nonce||ciphertext); NULL until setup
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  github_id INTEGER UNIQUE,        -- numeric GitHub user id; NULL = not linked
  github_login TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE recovery_codes (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,         -- sha256 hex
  used_at TEXT
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,             -- sha256 hex of the random 32-byte cookie token
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,             -- 'password' (awaiting TOTP/setup) | 'full'
  csrf_token TEXT NOT NULL,
  auth_method TEXT NOT NULL,       -- 'password' | 'github'
  ip TEXT, user_agent TEXT,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL, name_th TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL, desc_th TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  metric TEXT NOT NULL DEFAULT '',
  repo_url TEXT NOT NULL DEFAULT '', demo_url TEXT NOT NULL DEFAULT '',
  flagship INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE media (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,   -- <uuid>.<ext>
  original_name TEXT NOT NULL, mime TEXT NOT NULL,
  size INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL, title_th TEXT NOT NULL DEFAULT '',
  excerpt_en TEXT NOT NULL DEFAULT '', excerpt_th TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '', body_th TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,            -- e.g. login.password, login.github, project.update
  entity TEXT NOT NULL DEFAULT '', entity_id TEXT NOT NULL DEFAULT '',
  ip TEXT, created_at TEXT NOT NULL
);
CREATE TABLE login_attempts (ip TEXT NOT NULL, at TEXT NOT NULL);
CREATE INDEX idx_posts_status ON posts(status, published_at DESC);
CREATE INDEX idx_login_attempts ON login_attempts(ip, at);
```

Migrations are numbered `.sql` files embedded with `go:embed`, tracked in a
`schema_migrations(version)` table, each applied in a transaction.

Slugs: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 80 chars. Timestamps: RFC 3339 UTC strings.
`published_at` is set the first time a post transitions to `published` and kept afterwards.

### 3.4 Seed

`internal/seed/projects.json` contains the 11 current projects (kanban, domain-viewer,
queue-backend, realtime-chat, contextgate, context-nexus, mcp-control-tower,
automation-scripts, iron-coach-th, sarabun-ocr, flow-forge) with EN/TH names and
descriptions copied from `translations.ts`, plus tags/metric/repo/flagship/order from
`ProjectsSection.tsx`. Seeded only when the `projects` table is empty on startup.

### 3.5 Authentication

**Bootstrap:** if `admins` is empty, create the admin from `ADMIN_USERNAME`/`ADMIN_PASSWORD`
(password ≥ 12 chars, else startup error).

**Password + TOTP flow**

1. `POST /api/auth/login {username,password}` → on success creates a session with
   `stage='password'` (TTL 10 min) and returns
   `{next: "totp"}` if TOTP is enabled, otherwise `{next: "totp_setup"}`.
   Invalid credentials → 401 `invalid_credentials` (same response for unknown user;
   bcrypt compare against a dummy hash to keep timing flat).
2. `POST /api/auth/totp/setup` (stage=password, TOTP not enabled) → returns
   `{secret, otpauth_url}`; the secret is stored encrypted but `totp_enabled` stays 0.
3. `POST /api/auth/totp/verify {code}` → validates (±1 step skew). If this completes
   setup: sets `totp_enabled=1`, generates 8 recovery codes (format `xxxx-xxxx`,
   returned **once**), stores sha256 hashes. Upgrades the session to `stage='full'`,
   TTL 7 days, rotates the session id.
4. `POST /api/auth/recovery {code}` (stage=password) → consumes one unused recovery
   code, upgrades to full.

**GitHub flow** (enabled only when client id/secret set)

- `GET /api/auth/github/start?mode=login|link` → sets a signed, HttpOnly, 10-minute
  `oauth_state` cookie (random state + mode, HMAC with `SESSION_SECRET`) and redirects
  to GitHub (`read:user` scope). `mode=link` requires a full session.
- `GET /api/auth/github/callback` → verifies state cookie, exchanges the code, calls
  `GET https://api.github.com/user` for the numeric `id` and `login`.
  - `link`: requires the current full session; stores `github_id`/`github_login`
    (overwriting any previous link — there is only one admin). Redirects to
    `/admin/settings?linked=1`.
  - `login`: finds the admin with matching `github_id`. Match → full session
    (`auth_method='github'`), redirect `/admin`. No match → redirect
    `/admin/login?error=github_not_linked`. Never creates accounts.
- `POST /api/auth/github/unlink {code}` → requires full session **and** a valid TOTP code.

**Sessions:** cookie `sid` = random 32 bytes base64url; DB stores sha256 of it.
`HttpOnly; Secure (configurable); SameSite=Strict; Path=/`. `GET /api/auth/me` returns
`{username, github_login, totp_enabled, auth_method, csrf_token}`. `POST /api/auth/logout`
deletes current session; `POST /api/auth/logout-all` deletes all sessions of the admin.
`GET /api/auth/sessions` lists active sessions (ip, ua, created, current flag);
`DELETE /api/auth/sessions/{id}` revokes one. Expired sessions are purged hourly.

**CSRF:** every non-GET request under `/api/admin/*` and authenticated `/api/auth/*`
endpoints requires header `X-CSRF-Token` equal to the session's token. (The login
endpoint itself is protected by SameSite=Strict + JSON content-type requirement.)

**Rate limit:** `login`, `totp/verify`, `recovery`: max 5 failures per IP per 15 min,
tracked in `login_attempts` → 429 `rate_limited` with `Retry-After`. Successful login
clears that IP's attempts. Client IP from `X-Forwarded-For` only when the request comes
from the trusted proxy (Caddy on the compose network; configurable `TRUSTED_PROXY_CIDR`,
default `172.16.0.0/12`).

**Audit:** login successes/failures, logout, TOTP setup, GitHub link/unlink, every
create/update/delete of projects/posts/media.

### 3.6 API

Error envelope for every error: `{"error":{"code":"snake_case","message":"human text"}}`.
Validation errors: 422 `validation_failed` with `"fields": {"slug": "must match …"}`.
JSON request bodies limited to 1 MB; `Content-Type: application/json` required.

**Public**

| Method | Path | Notes |
|---|---|---|
| GET | `/api/projects` | published, ordered by `sort_order, id` |
| GET | `/api/posts?tag=&page=&per_page=` | published, newest first; `per_page` ≤ 50 (default 10); returns `{items, page, total}`; list items omit bodies |
| GET | `/api/posts/{slug}` | published only, 404 otherwise |
| GET | `/uploads/{file}` | `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff` |
| GET | `/rss.xml` | latest 20 published posts (EN) |
| GET | `/sitemap.xml` | `/`, `/blog`, each published post |
| GET | `/healthz` | `{"ok":true}` after a DB ping |

Public JSON shape uses both languages; the client picks: e.g. project
`{slug, name:{en,th}, description:{en,th}, tags, metric, repoUrl, demoUrl, flagship}`;
post `{slug, title:{en,th}, excerpt:{en,th}, body:{en,th}, tags, coverUrl, publishedAt}`.

**Admin** (full session + CSRF)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/projects` | all incl. unpublished |
| POST | `/api/admin/projects` | create; 409 `slug_taken` |
| GET/PUT/DELETE | `/api/admin/projects/{id}` | PUT is full replace |
| PUT | `/api/admin/projects/order` | `{ids:[…]}` → sort_order = index |
| GET | `/api/admin/posts?status=` | all, newest updated first |
| POST | `/api/admin/posts` | create |
| GET/PUT/DELETE | `/api/admin/posts/{id}` | |
| GET | `/api/admin/media` | newest first |
| POST | `/api/admin/media` | multipart field `file`; ≤ 5 MB; sniff via `http.DetectContentType` + `image.DecodeConfig`; allow png/jpeg/webp/gif → `{id,url,width,height}` |
| DELETE | `/api/admin/media/{id}` | deletes file + row |
| GET | `/api/admin/audit?page=` | newest first |

Validation: required `slug`, `name_en`/`title_en`, `desc_en`; URL fields must be empty
or `http(s)://`; tags ≤ 12, each ≤ 32 chars.

### 3.7 Web serving

- `GET /assets/*` and other static files from the embedded `dist` with long cache for
  hashed assets; `index.html` `no-cache`.
- Any other non-API GET → `index.html` (SPA fallback), with `<title>`, `meta description`,
  `og:title`, `og:description`, `og:image`, `og:url`, `link rel=canonical` injected:
  defaults for `/`, post-specific for `/blog/{slug}` (published only; draft → default meta).
  Injection replaces a `<!--app-meta-->` placeholder in `app/index.html`. All values are
  HTML-escaped.
- `/admin*` gets `<meta name="robots" content="noindex">`.
- Security headers on all responses: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  a CSP allowing self + Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`),
  `img-src 'self' data: https:`. (HSTS is added by Caddy.)

## 4. Frontend

### 4.1 Platform changes

- `HashRouter` → `BrowserRouter`. Routes: `/`, `/blog`, `/blog/:slug`, `/admin/*`
  (lazy chunk), `*` → 404 terminal page. Navbar anchors become `/#about` etc.; the
  home page scrolls to the hash on mount.
- Vite dev proxy: `/api`, `/uploads`, `/rss.xml`, `/sitemap.xml` → `http://localhost:8080`.
- Data fetching: `@tanstack/react-query`; one typed `api` client (`src/lib/api.ts`)
  that unwraps the error envelope into an `ApiError {status, code, message, fields}`
  and attaches `X-CSRF-Token` from the `me` query on mutations.
- Markdown: `react-markdown` + `remark-gfm` + `rehype-sanitize` + `rehype-highlight`
  (highlight.js theme restyled to the palette).
- Fonts: add **IBM Plex Sans Thai** (Google Fonts) as the Thai fallback in both
  `font-mono` and `font-body` stacks.
- i18n: new keys for blog, admin, 404 in both `en` and `th`. Content from the API is
  localized with `pick(field, lang)` = `field[lang] || field.en`.
- Tests: Vitest + React Testing Library + jsdom (`npm test`).

### 4.2 ASCII background (no 3D) — revised 2026-10-09 per user request

The 3D scene is removed entirely ("เอา 3D ข้างหลังออก ใช้ ascii เท่านั้น"). `src/sandbox/` and the
`three`, `@react-three/fiber`, `@react-three/drei` dependencies are deleted. The background is a
pure ASCII field rendered by a small raw-WebGL fragment shader (no three.js) in `src/background/`:

- `asciiMath.ts` — pure helpers mirrored 1:1 in GLSL (luminance→ramp index, radial falloff,
  hash, cell bucketing, scramble probability); unit-tested.
- `glyphAtlas.ts` — canvas texture with the ramp ` .:-=+*#%@` and the scramble set `0-9A-Z$#%&@`.
- `shader.ts` — GLSL sources. Per cell: animated value noise (slow drift) → brightness → ramp glyph,
  tinted `hud-border`→`neon-cyan`, with sparse brighter "data streams" for depth; cursor scramble:
  `s = max(falloff(mouse, 120px), trail)` → random scramble glyph + boost toward neon cyan when
  `hash(cell, tick) < s`; trail fades in ~0.6 s.
- `trail.ts` — ping-pong float/half-float framebuffers (raw WebGL) holding the fading drag trail.
- `AsciiBackground.tsx` — fixed `inset-0 z-0` canvas, `aria-hidden`, `pointer-events: none`
  (pointer input comes from window listeners, so content stays fully interactive), DPR ≤ 1.5,
  cell 8 px desktop / 10 px mobile, ≤ 60 fps, pauses on tab hide, disposes GL resources on unmount.
- `StaticAsciiBackdrop.tsx` — pre-generated static ASCII art used when `prefers-reduced-motion`,
  WebGL is unavailable, or the user toggles `[fx:off]` (persisted in localStorage `fx-enabled`).
- Navbar toggle `[fx:on]/[fx:off]` replaces the old 3D toggle.

### 4.3 Public pages (terminal redesign)

- New shared components in `src/components/term/`: `AsciiBox` (box-drawing frame with
  `+--[ title ]--+` header, responsive, pointer-events-auto), `Prompt`
  (`guest@prommin:~$ cmd`), `AsciiDivider`, `FigletTitle` (pre-generated figlet text for
  the name, stored as a string constant; `aria-label` holds the real text), `Cursor`.
- Home: Hero (figlet name + typed prompt + CTAs), About, Projects (data from
  `/api/projects`, loading state = `loading... [####----]` bar, error = `ERR:` line),
  Skills, Stats (focus areas), Latest posts (3 newest). Existing pointer-events contract kept.
- `/blog` (`ls -la ~/blog` listing with date, tags, title; tag filter chips; pagination),
  `/blog/:slug` (`cat` header, cover image, rendered markdown, prev/back link).
- `document.title` updated per page on the client too.
- The old `.panel-hud` / glow styles may be reused; remove the colorful 3D look only where
  replaced. `ContactSection.tsx` (unused) is deleted.

### 4.4 Admin Console (`src/admin/`)

- Lazy-loaded at `/admin/*`; no 3D canvas; full-screen terminal layout: left sidebar
  `[ projects ] [ posts ] [ media ] [ settings ] [ audit ]`, top status bar
  (`admin@prommin:~/admin/projects`, logged-in method, logout).
- `AuthGate` uses `GET /api/auth/me`; unauthenticated → `/admin/login`.
- **Login page**: username/password → TOTP code (or "use recovery code") → TOTP setup
  screen (QR rendered client-side with `qrcode` from `otpauth_url`, manual secret, then
  verify; show recovery codes once with copy/download). "Login with GitHub" button when
  `GET /api/auth/providers` says GitHub is enabled; shows `github_not_linked` error.
- **Projects**: ASCII table, drag-to-reorder (dnd-kit) → `PUT order`; editor form with
  EN | TH tabs, tags input, published/flagship toggles; delete requires typing the slug.
- **Posts**: list with status filter; editor = split pane markdown textarea + live preview
  (same renderer as public), EN | TH tabs, slug auto-generated from `title_en` (editable),
  tags, cover image picker, status toggle; paste/drop image → upload → inserts
  `![alt](/uploads/…)` at the cursor; draft autosave to `localStorage` every 5 s with
  restore prompt; `beforeunload` + route-leave warning when dirty.
- **Media**: grid, upload, copy markdown, delete (confirm).
- **Settings**: TOTP status, regenerate recovery codes (requires TOTP code), GitHub
  link/unlink, active sessions list with revoke, logout-all.
- **Audit**: paginated table.
- **Command palette** (`Ctrl/Cmd+K`): `new post`, `new project`, `edit <slug>`, `goto
  <section>`, `logout`.
- Forms show server `fields` errors inline as `ERR: …` lines; success via sonner toast.
- `POST /api/auth/recovery-codes/regenerate {code}` added for Settings.
- `GET /api/auth/providers` → `{github: bool}` (public).

## 5. Deployment

- `Dockerfile` (repo root): stage 1 `node:22-alpine` → `npm ci && npm run build` in `app/`;
  stage 2 `golang:1.27-alpine` → copy `app/dist` into `server/internal/web/dist`,
  `CGO_ENABLED=0 go build -trimpath -ldflags="-s -w"`; stage 3
  `gcr.io/distroless/static-debian12:nonroot`, `USER nonroot`, `EXPOSE 8080`,
  `VOLUME /data`. Binary supports `server healthcheck` subcommand (HTTP GET `/healthz`)
  for the compose healthcheck, since distroless has no curl.
- `deploy/docker-compose.yml`: `app` (image `ghcr.io/prommin01st-lang/petanque-website`,
  `env_file: .env`, volume `app-data:/data`, no published ports) and `caddy`
  (`caddy:2-alpine`, ports 80/443, `Caddyfile`, volumes `caddy-data`, `caddy-config`).
- `deploy/Caddyfile`: `{$DOMAIN} { encode zstd gzip; header Strict-Transport-Security
  "max-age=31536000; includeSubDomains"; reverse_proxy app:8080 }`.
- `deploy/.env.example` documents every variable with generation commands
  (`openssl rand -base64 32`).
- `deploy/backup.sh`: `docker compose exec` is impossible with distroless sqlite3, so the
  binary provides `server backup <dest.db>` (uses `VACUUM INTO`); the script runs it and
  tars `uploads/` with a date stamp, keeping the last 14.
- `deploy/README.md`: server setup, GitHub OAuth app creation (callback
  `https://$DOMAIN/api/auth/github/callback`), first login, backup/restore, update.
- `.github/workflows/ci.yml`: jobs `web` (npm ci, lint, test, build), `server`
  (go vet, go test -race), `image` (on push to main: build + push to GHCR with
  `GITHUB_TOKEN`).

## 6. Testing

- **Go** (`go test ./...`, in-memory SQLite per test via `file:<name>?mode=memory&cache=shared`):
  config validation; migrations idempotent; seed; auth (bad password, rate limit 429,
  totp setup → verify → recovery codes, recovery consumption single-use, session rotation,
  stage gating: a `password`-stage session gets 401 on admin APIs, CSRF missing → 403,
  logout-all, GitHub callback with fake OAuth server: link, login match, login mismatch
  → redirect error, bad state → 400); projects/posts CRUD + validation + slug conflict +
  public visibility (draft hidden) + language fallback fields; media sniffing (reject
  text-as-.png, oversize); meta injection escaping; rss/sitemap.
- **Frontend** (Vitest + RTL): `api` client error unwrapping + CSRF header; `pick`
  fallback; `asciiMath` helpers; Markdown renderer sanitization (no `<script>`);
  login flow state machine; post editor autosave/restore.
- **E2E** (Playwright, `e2e/`): run the built binary with a temp data dir, log in with
  password + generated TOTP, create a post, publish, see it on `/blog`.
- **Visual**: manual screenshot check of the ASCII scene (desktop + mobile).

## 7. Implementation phases

1. Go backend: skeleton, config, store/migrations, seed, auth (password/TOTP/sessions/
   CSRF/rate limit), projects/posts/media/audit APIs, web serving + meta, rss/sitemap.
2. Docker + deploy + CI.
3. Frontend platform: BrowserRouter, api client, react-query, vitest, i18n keys.
4. Admin Console.
5. Public pages: API-driven projects, blog list/detail, latest posts.
6. ASCII shader + background field + scramble/trail, terminal redesign of all sections.
7. E2E, docs (`AGENTS.md`, `deploy/README.md`), final verification.

## 8. Risks

- GPU shader cost on low-end mobile → larger cell size, DPR 1 render target, static fallback.
- Thai glyphs in ASCII art: figlet/ASCII art is English only; Thai content renders as
  normal text inside boxes.
- `BrowserRouter` requires the Go SPA fallback (any static host without rewrite rules
  would break deep links) — acceptable since deployment is the Go binary.

## 9. Revision — user feedback round (2026-10-09)

User feedback after seeing the redesign: colours and image interaction are missing, the background feels flat. Decisions:
- **Theme:** Linux-terminal palette = Tango ANSI 16 colours (GNOME Terminal / Ubuntu default), bash-default prompt colours (user@host bright green bold, path bright blue). Replaces the neon cyan/purple palette. See plan Task 21b.
- **Interactive images:** profile photo and blog covers render as terminal-coloured ASCII (ANSI-quantised), with hover scramble ripple + reveal lens and click-to-toggle photo. See plan Task 21d.
- **Depth:** background becomes three parallax ASCII layers (far/mid/near) driven by mouse + scroll, with CRT scanlines, vignette, bloom and flicker; scramble kept. See plan Task 21c.
