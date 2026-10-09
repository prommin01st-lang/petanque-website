# Terminal Shell, Status Bar & Boot Sequence — Design

Date: 2026-10-09 · Branch: `feature/terminal-window-cards` · Status: approved in conversation

## 1. Intent

Turn the ASCII terminal portfolio from "looks like a terminal" into "is a terminal you can use", so visitors (recruiters, developers) remember it — without making the site harder for people who don't use terminals.

**User decisions**
- Build three things: a Quake-style drop-down **shell**, a tmux-style **status bar**, a first-visit **boot sequence**.
- Shell role: **mixed** — read commands print into the shell; navigation commands (`cd`, `open`) drive the real page.
- Entry: **button + shortcut + hint** (`` ` `` key, `[ >_ shell ]` buttons, a hero hint line).
- Renderer: **xterm.js** (user tested it and is happy with it).

**Constraints / assumptions**
- The normal mouse-driven site stays fully usable; the shell is additive.
- EN/TH i18n rule applies to all new UI copy (`translations.ts`, both languages). Command names stay English.
- Public site only; the admin console is untouched.
- No backend changes: the shell reads existing public APIs.
- Builds on `TerminalWindow`, the Tango palette (`TANGO` constant, drift-guarded) and the existing reduced-motion / i18n / React Query infrastructure.

**Success criteria**
- `` ` `` opens a shell; `ls projects`, `cat ~/projects/kanban`, `cd skills`, `open <post>` work; history and Tab completion work.
- Status bar always shows the current section and stays in sync with scrolling and `cd`.
- Boot sequence shows once per session on `/`, is skippable, never delays content, and never shows under reduced motion or on deep links.
- The initial page bundle does not grow by more than ~15 kB gzip (xterm is lazy-loaded).
- Lint 0, unit + E2E tests green.

## 2. Architecture

```
app/src/shell/
  ShellProvider.tsx   context: open/close/toggle, global ` shortcut, exposes useShell()
  QuakeShell.tsx      drop-down panel (TerminalWindow chrome), lazy-loads xterm on first open
  xtermTheme.ts       Tango → xterm ITheme (derived from TANGO)
  readline.ts         line editor on an abstract Terminal port: insert/delete/←→/Home/End,
                      ↑↓ history, Tab completion, Ctrl+C, Ctrl+L, Enter → run
  parse.ts            "cat ~/projects/kanban" → { cmd, args } (quotes, extra spaces)
  complete.ts         completion of command names, paths and slugs
  fs.ts               virtual filesystem built from live data
  ansi.ts             tiny helpers: colour(text, tangoName), bold, link(url, text)
  commands/           one file per command, registered in commands/index.ts
app/src/statusbar/StatusBar.tsx
app/src/boot/BootSequence.tsx
app/src/hooks/useActiveSection.ts   scroll-spy extracted from Navbar, shared
```

**Boundary:** commands are pure-ish async functions
`(args, ctx) => Promise<ShellOutput>` where `ShellOutput` is an array of lines (strings with ANSI SGR colour codes and OSC-8 links) plus optional side effects requested through `ctx` (`ctx.navigate(path)`, `ctx.scrollTo(sectionId)`, `ctx.setLang(lang)`, `ctx.close()`, `ctx.clear()`). `ctx` also carries `t` (translations), `lang`, `signal` (AbortSignal), and data accessors backed by React Query (`ctx.data.projects()`, `ctx.data.posts()`, `ctx.data.post(slug)`), sharing the page's cache. Only `readline.ts` touches xterm, through a narrow port interface (`write`, `onData`, `cols`), so all command logic is testable without a canvas or DOM renderer.

### Virtual filesystem
```
~/about.md          (from translations: about copy)
~/skills/           (directories per skill category, files per skill)
~/projects/<slug>   (from GET /api/projects)
~/blog/<slug>       (from GET /api/posts, paged through)
```
Paths accept `~/x`, `/home/guest/x`, relative to cwd, and bare section names where unambiguous. `cwd` starts at `~`.

### Commands
| Command | Kind | Behaviour |
|---|---|---|
| `help` | read | list commands with one-line translated descriptions |
| `ls [path]` | read | list a directory; projects show `[★]` for flagship |
| `cat <path>` | read | about text, project (name, desc, tags, metric, repo link), post (title, date, excerpt + "open to read") |
| `tree [path]` | read | tree view (skills, whole home) |
| `whoami` | read | short bio line + links |
| `echo`, `date`, `history`, `clear` | read | standard |
| `lang en\|th` | effect | switch site language |
| `cd <section\|dir>` | nav | `cd about/projects/skills/blog` scrolls the home page to that section (navigating to `/` first if needed); `cd ~/blog` goes to `/blog`; also updates the shell cwd for directories |
| `open <project\|post\|url>` | nav | post → `/blog/<slug>`; project → its repo URL in a new tab (or its card if no repo) |
| `exit` | effect | close the shell |

Unknown command → `bash: foo: command not found` + `did you mean 'ls'?` (edit distance ≤ 2). Missing path → `cat: <path>: No such file or directory`.

### xterm configuration
- Packages: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`, `@xterm/addon-unicode-graphemes` (pinned exact versions).
- Lazy: `QuakeShell` dynamic-imports xterm and its CSS on first open; until loaded it shows `LoadingBar`.
- DOM renderer (default; no extra WebGL context alongside the background).
- `screenReaderMode: true`, `cursorBlink` off under reduced motion, font JetBrains Mono, theme from `xtermTheme.ts`.
- Links: OSC-8 hyperlinks plus web-links addon; internal links (`/blog/...`) route through react-router instead of a full reload.

### Shell UI
- Panel slides down from the top, ~50vh desktop / ~70vh mobile, inside `TerminalWindow` titled `guest@prommin: <cwd>`. Slide is instant under reduced motion.
- Open: `` ` `` (ignored when focus is in an input/textarea/contenteditable or with modifiers other than none/Ctrl), navbar `[ >_ shell ]`, status-bar `>_ shell`, hero hint line `press \` to open a shell` (translated; on touch devices "tap >_ shell").
- Close: `Esc`, `` ` ``, `exit`, the window's `×` button (made functional for this window only), or clicking outside. Focus returns to the opener.
- Welcome banner on first open per session: short translated greeting + `type 'help' to get started`.
- History persisted in `localStorage` (`shell-history`, last 100, try/catch).

## 3. Status bar

Fixed bottom bar, one line (~24px), Tango green background with dark text (tmux default):
```
[prommin] 0:home  1:about* 2:projects 3:skills 4:blog   >_ shell │ EN │ 19:24
```
- Window list is driven by `useActiveSection` (extracted from Navbar; Navbar switches to it too). `*` marks the active section; clicking scrolls there. On `/blog` and `/blog/:slug` the active window is `blog`.
- Right side: `>_ shell` toggle (active state while open), EN/TH toggle, local clock (updates on the minute).
- Mobile (<640px): `[0:home*] ‹ › >_ │ EN` where ‹ › step through sections.
- Layout: `main` and footer get bottom padding equal to the bar height; the sonner toaster offset is raised above it.
- Public layout only. Semantics: `<nav aria-label>` with buttons; the clock is `aria-hidden`.

## 4. Boot sequence

Full-screen overlay for ~1.2 s on first load of `/` per session:
```
[  OK  ] Mounted /home/prommin
[  OK  ] Started portfolio.service
[  OK  ] Reached target Graphical Interface
prommin login: guest (automatic login)
```
Lines appear one by one (`OK` in green), then the overlay fades out.
- Shown only when: path is `/`, `sessionStorage['booted']` is unset, reduced motion is off, and `navigator.webdriver` is false. Sets the flag when shown.
- Skippable instantly by any key, click or tap.
- The page renders underneath from the start; the overlay never blocks data loading or meta.
- Overlay is `aria-hidden` and does not take focus. Strings are translated.

## 5. Error handling

- Unknown command / missing path: messages above, shell stays usable.
- API failure: red `error: network unreachable (try again)`; uses the shared React Query cache so already-loaded data needs no refetch.
- xterm chunk fails to load (e.g. stale deploy): error line in the panel with `[ retry ]`.
- Long-running command: ASCII spinner `⠋⠙⠹…` while pending; `Ctrl+C` aborts via AbortSignal and prints `^C`.
- All storage access wrapped in try/catch; the shell works without storage.

## 6. Thai text risk

Thai combining vowels and tone marks in xterm depend on `addon-unicode-graphemes`. The first plan task is a spike that renders representative Thai strings (help text, a Thai post title) and screenshots them. If rendering is acceptable, shell output follows the site language. If not, shell output is always English (command help, messages) while Thai post titles are still shown but may be imperfect; the site UI remains fully bilingual either way. The spike result is recorded in the plan ledger.

## 7. Testing

- **Unit (Vitest, no xterm):** `parse`, `complete`, `fs`, every command's output lines and ANSI colours, `cd`/`open` side effects via a mocked ctx, `readline` against a fake terminal port (editing keys, history, Tab, Ctrl+C/L), suggestion distance.
- **Component:** StatusBar (active section, click-to-scroll, language toggle, mobile stepper), BootSequence (once per session, skip, suppressed under reduced motion / deep link / webdriver), ShellProvider (`` ` `` ignored inside inputs, focus returns on close).
- **E2E (Playwright):** press `` ` `` → `ls projects` → sees `kanban` → `cd skills` → page scrolled and status bar shows `skills*`. Existing E2E keeps passing (it runs with `navigator.webdriver`, so no boot overlay).
- **Visual:** Playwright screenshots of the shell with EN and TH output, desktop and 390px, and the status bar.
- Bundle check: initial entry chunk growth ≤ ~15 kB gzip; xterm only in a lazy chunk.

## 8. Order of work

1. Spike: xterm + Thai rendering (decides the §6 branch).
2. `useActiveSection` extraction + StatusBar.
3. Shell core: `parse`, `fs`, `complete`, `ansi`, commands (pure, tested).
4. xterm layer: `readline`, `QuakeShell`, `ShellProvider`, shortcuts, buttons, hero hint.
5. BootSequence.
6. E2E + AGENTS.md update.
