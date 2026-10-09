# AGENTS.md — ASCII Terminal Portfolio + CMS

> Written for AI coding agents. Assumes no prior knowledge of the project.

---

## Project Overview

A bilingual (English/Thai) portfolio site for a full-stack developer ("Prommin L.") with a small built-in CMS:

* **`app/`** — React 19 + Vite + TypeScript + Tailwind SPA. Public pages (home sections, `/blog`, `/blog/:slug`) styled as a **Linux terminal** (Tango ANSI palette, JetBrains Mono, ASCII boxes/prompts) over an **ASCII-only animated WebGL background**. An **admin console** lives under `/admin/*`.
* **`server/`** — Go HTTP server (chi + SQLite via `modernc.org/sqlite`, CGO-free). Serves the JSON API, uploaded media, RSS/sitemap, and the built SPA (embedded) with per-page `<head>` meta.
* **`deploy/`** — Docker Compose (app + Caddy for HTTPS) and a backup script.
* **`e2e/`** — Playwright suite that drives the real server binary with the embedded SPA.

Content (projects) is seeded from `server/internal/seed/projects.json` into an empty DB; afterwards everything is edited in the admin console. Portfolio copy is aligned with https://prommin01st-lang.github.io/.

**Repository root:**

| Path | Purpose |
|---|---|
| `app/` | Frontend SPA (public site + admin). |
| `server/` | Go module `github.com/prommin01st-lang/petanque-website/server`. |
| `e2e/` | Playwright end-to-end tests. |
| `deploy/` | `docker-compose.yml`, `docker-compose.cloudflare.yml`, `cloudflared/`, `Caddyfile`, `.env.example`, `backup.sh`, `README.md` (deploy guide). |
| `Dockerfile` | Multi-stage: node build → Go build (embeds `app/dist`) → distroless `nonroot`. |
| `.github/` | Empty on purpose: no CI workflows and no Dependabot (they spend Actions minutes). |
| `docs/superpowers/` | Design spec and implementation plan for the ASCII terminal CMS. |
| `tech-spec.md` | Historical design doc from the original site; may be stale. |

The dev host is **Linux**. Go lives at `~/tools/go/bin` on the maintainer's machine (`export PATH=$HOME/tools/go/bin:$PATH`).

---

## Commands

```bash
# Frontend (from app/)
npm install
npm run dev            # Vite on :3000; proxies /api, /uploads, /rss.xml, /sitemap.xml → :8080
npm test -- --run      # Vitest + React Testing Library (jsdom)
npm run lint           # ESLint flat config — must report 0 errors
npm run build          # tsc -b && vite build → app/dist (type errors fail the build)

# Backend (from server/)
go vet ./...
go test -race ./...
gofmt -l .             # must print nothing before committing Go
go run ./cmd/server    # needs env vars, see "Configuration"
# Subcommands of the binary: serve (default) | healthcheck | backup [--force] <dest>
#   | admin reset-password <user>  (new password on stdin, >= 12 chars; revokes sessions)
#   | admin reset-2fa <user>       (clears TOTP + recovery codes + sessions)
#   Both also clear the account lockout (login_attempts key admin:<id>); per-IP rows stay.
# Both admin commands audit-log with ip "cli"; exit 2 = usage, 1 = failure. See deploy/README.md "Recovery".

# E2E (from e2e/)
npm ci && npx playwright install chromium
npm test               # builds app, embeds it, builds the server, runs it on :8090
E2E_SKIP_BUILD=1 npm test   # reuse the last e2e/.data/server binary

# Docker
docker build -t petanque-site .
```

For local full-stack dev: run the Go server on `:8080` (with `COOKIE_SECURE=false`) and `npm run dev` in `app/`. The Go binary only serves the SPA that was embedded at build time: copy `app/dist/*` into `server/internal/web/dist/` before `go build` (that directory is gitignored except `.keep`; the Dockerfile and `e2e/scripts/build.mjs` do this for you).

**Lint:** `npm run lint` is clean (0 errors); run it before committing. `eslint.config.js` turns off `react-refresh/only-export-components` for the generated `src/components/ui/**` and `src/i18n/I18nContext.tsx`, and `react-hooks/purity` for `src/components/ui/sidebar.tsx` (shadcn skeleton `Math.random()`); first-party code gets no exemptions.

**Bundle:** `vite.config.ts` puts React/ReactDOM/router in a `react-*` vendor chunk (entry ≈ 285 kB, vendor ≈ 231 kB); markdown/highlight and the admin are lazy chunks.

**Dev-only plugin:** `plugin-inspect-react-code` (`inspectAttr`) runs only for `vite` serve; production builds carry no `code-path=` attributes.

---

## Backend (`server/`)

Entry: `cmd/server/main.go` — loads config, migrates, seeds projects, bootstraps the admin, serves with graceful shutdown, purges expired sessions hourly. Also hosts the `healthcheck`, `backup` and `admin reset-password|reset-2fa` (offline recovery, `auth.ResetPassword` / `auth.ResetTOTP`) subcommands.

| Package | Role |
|---|---|
| `internal/config` | Env → `Config`; validates everything at startup. |
| `internal/store` | `Open` (SQLite, WAL), `Migrate` (embedded `migrations/0001_init.sql`, `0002_totp_last_step.sql`, `0003_login_attempts_id.sql`), `Backup` (`VACUUM INTO`), `Now()` / `FormatTime` / `ParseTime`. `storetest` gives tests a migrated temp DB. |
| `internal/httpx` | `WriteJSON`, `DecodeJSON` (strict), `Fail`, `NewError`, `Validation`, `ErrNotFound`/`ErrUnauthorized`…, `ClientIP`, `SecurityHeaders`. |
| `internal/validate` | Shared field validators (slug, tags, URLs, lengths). |
| `internal/auth` | Password hashing, AES-GCM TOTP secret encryption, sessions, login state machine, rate limiting, CSRF, GitHub OAuth, admin bootstrap. |
| `internal/projects` | Public `GET /api/projects`; admin CRUD + reorder. |
| `internal/posts` | Public paged/tag-filtered list + get by slug (published only); admin CRUD with draft/published status. |
| `internal/media` | Image upload (≤ 5 MiB, content sniffed with `http.DetectContentType` + `image.DecodeConfig`; png/jpeg/webp/gif), list, delete, `GET /uploads/{file}`. |
| `internal/audit` | `audit.Log(...)` best-effort audit trail; admin listing. |
| `internal/seed` | Seeds `projects.json` into an empty `projects` table. |
| `internal/web` | Embedded SPA (`dist/`), `RenderIndex` (replaces `<title>` and `<!--app-meta-->` with escaped title/description/og/twitter/canonical tags; `noindex` for `/admin`, unknown/draft `/blog/:slug` and any unmatched SPA route — still 200; per-post meta for `/blog/:slug`), `/rss.xml`, `/sitemap.xml`, long-cache `/assets/*`. |
| `internal/app` | Assembles the router (`/healthz`, auth, media, projects, posts, admin group, SPA fallback). |
| `internal/testutil` | Authenticated HTTP test client for handler tests (full-stage session + CSRF). |

### Conventions (binding)

* **JSON is camelCase.** Errors: `{"error":{"code":"snake_case","message":"…"}}` via `httpx.Fail`. Validation: `httpx.Validation(fields)` → **422 `validation_failed`** with camelCase field keys.
* **Lists** return `{"items":[...]}`; paged lists add `page`, `perPage`, `total`.
* **Timestamps:** always `store.Now()` / `store.FormatTime(t)` — fixed-width UTC `2006-01-02T15:04:05.000Z` (lexicographically sortable). Never format times yourself.
* **Slugs** `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 80. **Tags** ≤ 12, each ≤ 32 chars. **URLs** empty or `http(s)://`.
* **Client IP:** always the handler's `ClientIP` (`httpx.ClientIP` walks `X-Forwarded-For` right-to-left, trusting only `TRUSTED_PROXY_CIDR`; unset = no proxy trusted). Never read the header yourself.
* New schema changes = a new numbered migration file; never edit applied ones.

### Auth model

* **Login:** `POST /api/auth/login` (password) → session at stage `password` (TTL 10 min) → `totp` (or first-time `totp_setup` + recovery codes) or `recovery` → stage `full` (TTL 7 days). Tokens are random; the DB stores their **sha256**.
* **Cookie:** `sid`, HttpOnly, SameSite=Strict, Secure unless `COOKIE_SECURE=false`.
* **CSRF:** full sessions carry a CSRF token (returned by `/api/auth/me` as `csrfToken`); every non-GET/HEAD request under `/api/admin` and the full-stage `/api/auth/*` routes must send `X-CSRF-Token` (403 `csrf_failed`).
* **Rate limiting** (`auth/ratelimit.go`, table `login_attempts`): 15-minute window, 5 failures per IP (all steps), 10 per admin account (second-factor steps). Each attempt is **reserved** (pre-charged as a failure under a mutex) before slow verification and **refunded** by its AUTOINCREMENT id unless it was a real credential failure; history is cleared only when a session reaches `full`. Limited → 429 `rate_limited` + `Retry-After`. DB errors fail closed.
* **TOTP replay guard:** `admins.totp_last_step`; a code's time step must be strictly greater than the last accepted one (atomic `UPDATE … WHERE totp_last_step < ?`). After a failed attempt the user may need the next code.
* **GitHub (optional):** login-with-GitHub only for an already-linked admin. **Linking requires a TOTP step-up** (`POST /api/auth/github/link` with a code → `{url}`). Callback redirects: `/admin/login?error=github_not_linked|github_failed` (also for a missing/forged/expired state cookie), `/admin/settings?linked=1`, `/admin/settings?error=github_in_use|github_failed`.
* **Password change:** `POST /api/auth/password {currentPassword,newPassword,code}` (full + CSRF, rate-limited like a step-up; 422 `newPassword` for < 12 chars, > 72 bytes or unchanged) updates the hash and deletes every *other* session of the admin; audit `admin.password_change` / `_failed`.
* Security-relevant actions (logins, failures, CRUD, sessions, recovery, GitHub link) go to `audit_log`.

### API

| Method & path | Auth | Notes |
|---|---|---|
| `GET /healthz` | — | `{"ok":true}` after DB ping. |
| `GET /api/projects` | — | Ordered public projects. |
| `GET /api/posts?page&perPage&tag` | — | Published posts, paged. |
| `GET /api/posts/{slug}` | — | One published post. |
| `GET /uploads/{file}` | — | Uploaded media. |
| `GET /rss.xml`, `GET /sitemap.xml` | — | Feeds. |
| `GET /api/auth/providers` | — | `{github: bool}`. |
| `POST /api/auth/login`, `/totp/setup`, `/totp/verify`, `/recovery`, `/logout` | partial session | Login state machine. |
| `GET /api/auth/github/start`, `/github/callback` | — | OAuth flow. |
| `GET /api/auth/me`, `/sessions`; `POST /logout-all`, `/recovery-codes/regenerate`, `/password`, `/github/link`, `/github/unlink`; `DELETE /sessions/{id}` | full + CSRF | Account/session management. |
| `/api/admin/projects` (GET, POST), `/projects/{id}` (GET, PUT, DELETE), `PUT /projects/order` | full + CSRF | Projects CMS. |
| `/api/admin/posts?status` (GET, POST), `/posts/{id}` (GET, PUT, DELETE) | full + CSRF | Posts CMS. |
| `/api/admin/media` (GET, POST multipart), `DELETE /media/{id}` | full + CSRF | Media library. |
| `GET /api/admin/audit?page` | full | Audit log. |
| anything else (GET/HEAD) | — | SPA shell with injected meta; `/api/*` and `/uploads/*` misses → JSON 404. |

### Configuration (env)

| Var | Required | Default / notes |
|---|---|---|
| `PUBLIC_URL` | yes | `http(s)://…`, used for canonical/og/RSS URLs. |
| `SESSION_SECRET` | yes | ≥ 32 bytes. |
| `TOTP_ENC_KEY` | yes | 32 bytes, base64 (`openssl rand -base64 32`). |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | first start | Bootstraps the admin (password ≥ 12 chars). |
| `ADDR` | no | `:8080`. |
| `DATA_DIR` | no | `/data` (holds `app.db` and `uploads/`). |
| `COOKIE_SECURE` | no | `true`; set `false` for plain-HTTP local/e2e. |
| `TRUSTED_PROXY_CIDR` | no | Empty = trust no proxy (client IP = `RemoteAddr`). Behind Caddy in compose set `172.28.0.0/16` (as in `.env.example`). |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | no | Both or neither. |

---

## Frontend (`app/`)

### Stack (from `package.json`)

React 19, react-router-dom 7 (**BrowserRouter**), @tanstack/react-query 5, Tailwind 3 + shadcn/ui (Radix, `src/components/ui/*`, 53 generated files — don't expand unless asked), framer-motion, sonner (toasts), react-markdown + remark-gfm + rehype-sanitize + rehype-highlight (highlight.js via lowlight, not a direct dependency), qrcode, @dnd-kit (project reorder), cmdk, lucide-react. Tests: Vitest + RTL + jsdom. **There is no three.js / React Three Fiber / gsap** — the old 3D sandbox and pixel-art themes are gone.

### Layout

```
app/src/
├── App.tsx              # BrowserRouter: /admin/* → lazy AdminApp (outside Layout); Layout → /, /blog, /blog/:slug, * (404)
├── main.tsx             # I18nProvider + QueryClientProvider
├── index.css            # Tailwind layers, CSS vars (Tango palette), term/HUD component classes, md/hljs styles
├── background/          # ASCII WebGL background (see below)
├── components/
│   ├── Layout.tsx       # background (or static backdrop) + Navbar + <Outlet/> + Footer + Toaster
│   ├── Navbar.tsx       # prompt logo, links, scroll-spy, EN|TH toggle, [fx] toggle, accessible mobile menu
│   ├── Footer.tsx
│   ├── AsciiImage.tsx   # interactive terminal-coloured ASCII image (+ asciiImage.ts pure helpers)
│   ├── Markdown.tsx     # sanitized + highlighted markdown (`<Markdown source=… />`)
│   ├── term/            # TerminalWindow (GNOME-style window card), Prompt, AsciiDivider, FigletTitle (+FIGLET_NAME), Cursor, LoadingBar, ErrorLine
│   └── ui/              # shadcn primitives
├── pages/               # HomePage, BlogListPage, BlogPostPage, NotFoundPage
├── sections/            # Hero, About, Projects, Skills, Stats, LatestPosts (+ SectionHeading)
├── admin/               # admin console (see below)
├── lib/                 # api.ts, types.ts, pick.ts, queryClient.ts, useDocumentTitle.ts, utils.ts (cn)
├── i18n/                # I18nContext.tsx, translations.ts
└── test/setup.ts        # clears localStorage, restores mocks after each test
```

* **API client** (`lib/api.ts`): `request` with `credentials: 'same-origin'`, strict JSON handling (`ApiError{status,code,message,fields}`; non-JSON 2xx → `bad_response`; network → status 0), CSRF header from `setCsrfToken`, `upload(file)`. Grouped as `api.projects/posts/post`, `api.auth.*`, `api.admin.*`.
* **Query keys:** `['projects']`, `['posts', params]`, `['post', slug]`, `['me']`, `['admin','projects']`, `['admin','posts', status]`, `['admin','post', id]`, `['admin','media']`, `['admin','audit', page]`, `['admin','sessions']`.
* **Localized content** comes from the API as `{en, th}`; render with `pick(l, lang)` (falls back to `en`).
* `useDocumentTitle(title)` sets `<title> — Prommin L.`; the server injects the same title for crawlers.

### ASCII background (`src/background/`)

* `AsciiBackground.tsx` — fixed full-viewport WebGL (1 or 2) canvas (`data-testid="ascii-background"`, `aria-hidden`, `pointer-events-none`; input via window listeners). A **layered parallax ASCII field** (glyph atlas `glyphAtlas.ts`, shaders in `shader.ts` mirroring `asciiMath.ts` — keep them in sync), a **cursor scramble trail** (`trail.ts`, `usePointerField.ts`), and **CRT post effects** (scanlines, vignette, phosphor bloom, slow flicker).
* `qualityGovernor.ts` — frame-time governor that steps quality down/up (levels 0–2).
* `glLifecycle.ts` — context loss/restore: tear down on loss, re-init on restore; `StaticAsciiBackdrop` shows while lost or if init fails. Pauses on hidden tabs; tracks DPR changes.
* `StaticAsciiBackdrop.tsx` — pre-generated `<pre>` field (`data-testid="static-ascii-backdrop"`) used when fx is off, motion is reduced, or WebGL fails.
* `useFxEnabled.ts` — `[fx]` toggle in the Navbar, persisted in `localStorage` (`fx-enabled`, default on); forced off (toggle disabled) while `prefers-reduced-motion: reduce`.
* Dev-only deterministic frame: `?asciiT=<ms>[&asciiMouse=x,y][&asciiScroll=px]`.

### Interactive ASCII images

`AsciiImage` renders an image as Tango-coloured ASCII on a canvas (Bourke ramp, auto-levels, nearest-ANSI colour via `asciiImage.ts`). Interactive mode: hover lens reveals the photo locally; click or the `[ASCII / photo]` button (`aria-pressed`) toggles the full photo. Falls back to a plain `<img>` without canvas support. Used for the hero portrait and blog covers (`interactive={false}` in lists).

### Theme: Linux terminal (Tango ANSI)

* Tokens in `tailwind.config.js`: semantic `bg`, `surface`, `text`, `text-dim`, `hud-border`, `prompt-user`, `prompt-path`, `link`, `warn`, `danger`, `tag`, plus `ansi.{black…white}` and `ansi.bright.*`. Matching CSS vars in `index.css` — keep both in sync. `asciiImage.test.ts` has a **Tango drift guard** comparing `TANGO` with `tailwind.config.js` and `index.css`; the background shader's `FIELD_PALETTE` is derived from `TANGO` via `tango(name)` and checked too.
* `accent` is shadcn's token — for cyan text use `text-ansi-bright-cyan`.
* Fonts (Google Fonts in `index.html`): JetBrains Mono (`font-mono`), Inter (`font-body`), IBM Plex Sans Thai (Thai fallback for both).
* Component classes (`index.css`): `.term-window*` (TerminalWindow chrome only — never hand-roll a title bar), `.btn-neon`, `.btn-neon-outline`, `.btn-danger-outline`, `.btn-term`, `.chip`/`.chip-green`, `.input-hud`, `.textarea-hud`, `.link-neon`, `.term-tab*`, `.term-tag`, `.ascii-table*`, `.ascii-divider*`, `.ascii-image*`, `.md-term` (markdown), `hljs-*`. Prefer these over one-off styles.
* **Pointer-events contract:** section wrappers `pointer-events-none`, content panels `pointer-events-auto`.

### Admin console (`src/admin/`)

* Routes: `/admin/login`; behind `AuthGate` (redirects to login with `state.from`) and `AdminLayout`: `projects`, `projects/new`, `projects/:id`, `posts`, `posts/new`, `posts/:id`, `media`, `settings`, `audit`.
* Login (`login/`): password → TOTP / recovery code, or first-time TOTP setup (QR + `data-testid="totp-secret"`) → recovery codes (checkbox gates `[continue]`). Optional "Login with GitHub" link.
* Post editor: EN|TH tabs, markdown preview (side by side ≥ 1024px), draft/published toggle, image paste/drop upload, Ctrl/Cmd+S, **localStorage autosave** (`draft:post:<id|new>`) with restore banner; drafts are cleared on logout. `dirtyGuard.ts` confirms before leaving with unsaved changes.
* Projects: CRUD + drag reorder. Media: upload/list/delete, copy markdown. Settings: change password (current password + TOTP; revokes other sessions), sessions, logout-all, recovery regeneration, GitHub link/unlink. Audit: paged log.
* **Command palette:** Ctrl/Cmd+K.

### i18n

Custom context (`useI18n()` → `{lang, t, setLang, toggleLang}`), languages `en` (default) and `th`. **Every UI string goes in `src/i18n/translations.ts` under both `en` and `th` (real Thai).** Term-kit components don't translate internally — pass `retryLabel={t.common.retry}`, `label={t.common.loading}`, `fallbackMessage={t.common.error}`.

### Code style

* TypeScript strict (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` → `import type` for types, `erasableSyntaxOnly`). Path alias `@/*` → `src/*`.
* React Compiler lint rules are on: no `Math.random()` during render (use `hashRand`), no ref writes during render.
* Code, comments and docs in English; Thai only in translations.

---

## Shell, status bar, boot

An xterm.js Quake drop-down shell, a tmux-style status bar and a first-visit boot sequence, all on the public site (never `src/admin/**`).

### File map

```
app/src/
├── shell/
│   ├── loadXterm.ts         # dynamic import of xterm + addons + CSS (the only xterm import site)
│   ├── xtermTheme.ts        # xterm theme from TANGO (no new hex literals)
│   ├── ansi.ts              # color()/link helpers (SGR + OSC-8)
│   ├── parse.ts             # line -> {cmd, args} (quotes, escapes)
│   ├── fs.ts                # virtual FS: /projects, /blog, /skills ... (skillSlug, slugged skill file names)
│   ├── suggest.ts           # "did you mean" (edit distance)
│   ├── complete.ts          # Tab completion over commands and FS paths
│   ├── types.ts             # ShellContext, Command, ShellOutput, ShellData
│   ├── commands/            # index.ts registry + run(); one file per command
│   ├── readline.ts          # line editor (history, completion, Ctrl keys); the only file that writes to a TermPort
│   ├── safeUrl.ts           # classifyUrl: every opened/linked URL must be http(s) or a same-site /... path
│   ├── useShell.ts / useShellContext.ts / ShellProvider.tsx   # state, ShellContext wiring, ` / Esc handling
│   └── QuakeShell.tsx       # lazy drop-down panel hosting xterm
├── statusbar/               # StatusBar.tsx (nav "Window list": N:name* windows, [>_ shell]) + constants.ts
├── hooks/useActiveSection.ts# shared by Navbar and StatusBar
└── boot/                    # shouldBoot.ts + BootSequence.tsx (overlay z-[200])
```

### Commands

`help`, `ls`, `cat`, `tree`, `whoami`, `echo`, `date`, `history`, `clear`, `lang`, `cd`, `open`, `exit` (registry: `shell/commands/index.ts`). Hidden easter eggs (`hidden: true` — left out of `help`, Tab completion and suggestions): `login`, `sudo su`, `ssh admin@prommin` open `/admin/login`; other `sudo`/`ssh` targets print a refusal. `help` is a `makeHelp(() => COMMANDS)` factory to avoid a circular import. Open with the backtick key or the status bar `>_ shell` button; close with Esc (inside xterm this is handled by `attachCustomKeyEventHandler`, because xterm stops propagation) or `exit`. The shell window's title-bar buttons are live: `_` minimizes to the title bar (click the bar to restore), `□` maximizes (double-clicking the bar toggles it too), `×` closes. `TerminalWindow` makes a button real only when its handler (`onClose`/`onMinimize`/`onMaximize`) is passed; cards without handlers keep decorative, `aria-hidden` buttons (`.term-window-buttons` is `pointer-events: none`, `.term-window-buttons-live` re-enables it).

### Boundaries and rules

* **`ShellContext` boundary:** commands receive a `ShellContext` and return `string[]`; they never import xterm. Only `readline.ts` writes to a `TermPort`.
* **Lazy loading:** xterm and its CSS live only in the lazy chunk (via `loadXterm`); entry chunk budget is ~15 kB gzip over the 90,856 B baseline; xterm stays lazy only. Never statically import xterm elsewhere. The lazy `QuakeShell` sits behind `ShellChunkBoundary` (retryable error panel if the chunk fails to load).
* **React Query keys shared with the page:** only `['projects']` and `['post', slug]`; the shell's posts list uses its own `perPage` (so `['posts', {page, perPage: 50}]` is not shared) (`useShellContext.ts`). Ctrl+C aborts the shell's wait (`abortable`), never the shared query.
* **`SHELL_THAI=ok`:** the shell follows the site language (`lang`), so its UI strings (`t.shell.*`) and Thai content render in the terminal; add every shell string to both `en` and `th`.
* **`useActiveSection`:** one scroll-spy for Navbar and StatusBar; falls back to the last present section at page bottom and re-evaluates on resize.
* **Boot gating (`shouldBoot`):** only on `/`, once per session (`sessionStorage` `booted`), skipped under `prefers-reduced-motion` and when `navigator.webdriver` is true. All storage access is in try/catch.
* **Tests:** `src/test/setup.ts` sets `navigator.webdriver = true` so unit tests never boot; Playwright also sets it, so the overlay never shows in E2E. xterm runs with `screenReaderMode: true`, so `.xterm-accessibility-tree` has the text if `.xterm-rows` does not. E2E: `e2e/shell.spec.ts`.

---

## Testing

* **Go:** `go test -race ./...`; handler tests use `storetest` + `testutil` (authenticated client with CSRF).
* **Frontend:** Vitest + RTL (`npm test -- --run`). Mock the API with `vi.mock('@/lib/api', async (orig) => ({ ...(await orig()), api: {...} }))` to keep the real `ApiError`.
* **E2E** (`e2e/`): Playwright, Chromium. `npm test` runs `scripts/build.mjs` (app build → copy into `server/internal/web/dist` → `go build -o e2e/.data/server`) as part of the `webServer` command (Playwright starts `webServer` before `globalSetup`), then the server on **:8090** with a fresh `DATA_DIR` (`e2e/.data/run-<ts>`) and `COOKIE_SECURE=false`. Default context uses `contextOptions.reducedMotion: 'reduce'` (static backdrop); one test opts back in to check the WebGL canvas. Specs cover TOTP enrolment, publishing a post, `/blog` + server-rendered meta + RSS, seeded projects, and the hero ASCII toggle.

---

## Deployment

* **Docker:** `Dockerfile` builds the SPA, embeds it, compiles a static Go binary (`CGO_ENABLED=0`), runs as distroless `nonroot` with `/data` volume, `HEALTHCHECK` via `/server healthcheck`.
* **Compose** (`deploy/`): `app` (built locally from the repo `Dockerfile`, tag `petanque-website:latest`) + `caddy` (automatic HTTPS, HSTS, zstd/gzip) on network `172.28.0.0/16`. See `deploy/README.md` for setup, first login, restore and updates.
* **Cloudflare Tunnel** (alternative to opening ports 80/443): `docker-compose.cloudflare.yml` override — runs a `cloudflare/cloudflared` connector on the internal network (`www.$DOMAIN` → `http://app:8080`, TLS at the edge, no published ports) and disables Caddy unless `--profile direct`. Tunnel creds live in `deploy/cloudflared/creds.json` (gitignored, `chown 65532`). Start with `docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d`.
* **Backups:** `deploy/backup.sh` runs `/server backup --force` (SQLite `VACUUM INTO`) and tars uploads into `./backups`, keeping the newest 14.
* **No CI (owner's decision — GitHub Actions minutes cost money).** Do not add `.github/workflows/*`. Verification is local: Go vet/tests, `npm run lint` / `npm test -- --run` / `npm run build`, e2e when relevant, and a successful `docker build` (or `deploy/local-up.sh`).

---

## Gotchas

* Never commit `app/dist`, `server/internal/web/dist/*` (except `.keep`), `*.db`, `e2e/.data`, or the user's untracked `.agents/`, `.claude/`, `skills-lock.json`.
* `app/public/` holds only `profile.png` (hero portrait and the default og image).
* Playwright lives only in `e2e/package.json`; `app/` has no Playwright dependency.
* TOTP codes are single-use: tests or scripts that log in twice within 30 s need the next code.

* **Local Docker run:** `deploy/local-up.sh` (compose file `deploy/docker-compose.local.yml`, app on http://localhost:8088, secrets in gitignored `deploy/.env.local`). `server migrate` runs migrations + project seed + admin bootstrap once and exits (the same `prepare()` that `serve` runs on start).
