# Terminal Shell, Status Bar & Boot Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Quake-style xterm.js shell, a tmux-style status bar and a first-visit boot sequence to the public ASCII terminal portfolio.

**Architecture:** Shell logic (parser, virtual filesystem, completion, commands) is plain TypeScript returning ANSI lines plus side-effect requests through a `ShellContext`; only `readline.ts` talks to xterm through a narrow `TermPort`. xterm is lazy-loaded on first open. The status bar and navbar share one `useActiveSection` hook. The boot overlay is a self-contained component gated by sessionStorage, reduced motion and `navigator.webdriver`.

**Tech Stack:** React 19, TypeScript (strict, `verbatimModuleSyntax`), Vite 7, Tailwind 3, React Query 5, react-router-dom 7 (BrowserRouter), `@xterm/xterm` + `@xterm/addon-fit` + `@xterm/addon-web-links` + `@xterm/addon-unicode-graphemes`, Vitest + React Testing Library, Playwright (e2e/).

**Spec:** `docs/superpowers/specs/2026-10-09-terminal-shell-design.md`

## Global Constraints

- Work on branch `feature/terminal-window-cards`; run app commands from `app/`.
- `npm run lint` must stay at **0 problems**; `npm test -- --run` and `npm run build` must pass after every task.
- All new UI copy goes into `app/src/i18n/translations.ts` in **both** `en` and `th` (under a new `shell`, `statusBar` and `boot` key). Command names stay English.
- Public site only — do not touch `app/src/admin/**`.
- No backend changes; the shell reads `api.projects()`, `api.posts()`, `api.post(slug)`.
- Shell data uses the **same React Query keys** as the page: `['projects']`, `['posts', { page, perPage }]`, `['post', slug]`.
- xterm and its CSS must live only in a lazy chunk; the entry chunk may grow by at most ~15 kB gzip.
- Colours come from `TANGO`/`tango()` in `app/src/components/asciiImage.ts` (drift-guarded) — no new hard-coded hexes for ANSI colours.
- Honour `prefers-reduced-motion` (no slide animation, no cursor blink, no boot overlay).
- `localStorage`/`sessionStorage` access always inside try/catch.
- `import type` for type-only imports. Default-exported components; helpers in the same file.
- Pin new npm packages to exact versions (`npm i -E`).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never stage `.agents/`, `.claude/`, `skills-lock.json`. Screenshots go under `.superpowers/sdd/2026-10-09-ascii-terminal-cms/screens/`, never the repo root.

## Review Focus

1. Pressing `` ` `` while typing in any input/textarea/contenteditable (e.g. admin is out of scope, but the blog has no inputs — still guard generically) must type the character, not open the shell. → Task 6 test.
2. Pasting multi-line text or a very long line into the shell must not run several commands or break the prompt: paste inserts at the cursor with newlines turned into spaces; only Enter runs. → Task 5 test.
3. `cd`/`open` when the target section or post does not exist, or when the visitor is on `/blog/x`, must give a clear error or navigate to `/` first — never a silent no-op. → Task 4 tests.
4. Data not loaded yet / API offline: `ls ~/projects` must show a loading spinner then either the list or `error: network unreachable`, and Ctrl+C must abort the wait. → Task 4 + Task 5 tests.
5. The status bar must not cover the last content (footer links, toasts) on any viewport, including mobile with the on-screen keyboard closed. → Task 2 test + visual check.

---

## File Structure

```
app/src/data/skills.ts                 skill categories (moved from SkillsSection)
app/src/hooks/useActiveSection.ts      shared scroll-spy
app/src/statusbar/StatusBar.tsx        tmux-style bar
app/src/shell/ansi.ts                  SGR colour + OSC-8 link helpers, visible-width
app/src/shell/parse.ts                 tokenizer
app/src/shell/fs.ts                    virtual filesystem + path resolution
app/src/shell/complete.ts              Tab completion
app/src/shell/suggest.ts               edit distance "did you mean"
app/src/shell/types.ts                 ShellContext, Command, ShellOutput, ShellData
app/src/shell/commands/index.ts        registry + run()
app/src/shell/commands/*.ts            one command per file
app/src/shell/readline.ts              line editor on TermPort
app/src/shell/xtermTheme.ts            Tango → xterm ITheme
app/src/shell/loadXterm.ts             lazy loader for xterm + addons + css
app/src/shell/ShellProvider.tsx        context, shortcut, open/close, focus return
app/src/shell/QuakeShell.tsx           drop-down panel hosting xterm
app/src/shell/useShellContext.ts       builds ShellContext from router/i18n/query
app/src/boot/BootSequence.tsx          boot overlay
e2e/shell.spec.ts                      E2E
```

---

### Task 1: xterm dependencies, lazy loader and Thai rendering spike

**Files:**
- Modify: `app/package.json`, `app/package-lock.json`
- Create: `app/src/shell/loadXterm.ts`, `app/src/shell/xtermTheme.ts`, `app/src/shell/xtermTheme.test.ts`
- Spike only (delete before commit): `app/src/shell/__spike__/ThaiSpike.tsx`, temporary route

**Interfaces:**
- Produces:
  - `loadXterm(): Promise<XtermModules>` where `interface XtermModules { Terminal: typeof import('@xterm/xterm').Terminal; FitAddon: typeof import('@xterm/addon-fit').FitAddon; WebLinksAddon: typeof import('@xterm/addon-web-links').WebLinksAddon; UnicodeGraphemesAddon: typeof import('@xterm/addon-unicode-graphemes').UnicodeGraphemesAddon }` (caches the promise; on rejection clears the cache so a retry re-imports).
  - `xtermTheme(): import('@xterm/xterm').ITheme` built from `TANGO`.
  - Ledger line `SHELL_THAI=ok|english` appended to `.superpowers/sdd/2026-10-09-ascii-terminal-cms/progress.md`.

- [ ] **Step 1: Install pinned packages**

Run: `cd app && npm i -E @xterm/xterm @xterm/addon-fit @xterm/addon-web-links @xterm/addon-unicode-graphemes`
Expected: four exact versions added to `dependencies`.

- [ ] **Step 2: Write failing theme test** (`app/src/shell/xtermTheme.test.ts`)

```ts
import { xtermTheme } from './xtermTheme';
import { tango } from '@/components/asciiImage';

it('maps the 16 ANSI slots to Tango', () => {
  const th = xtermTheme();
  expect(th.red).toBe(tango('red').normal);
  expect(th.brightRed).toBe(tango('red').bright);
  expect(th.green).toBe(tango('green').normal);
  expect(th.brightCyan).toBe(tango('cyan').bright);
  expect(th.black).toBe(tango('black').normal);
  expect(th.brightWhite).toBe(tango('white').bright);
  expect(th.foreground).toBe(tango('white').normal);
  expect(th.background).toBe('#00000000'); // transparent: TerminalWindow body shows through
});
```

- [ ] **Step 3: Run it** — `npx vitest run src/shell/xtermTheme.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `xtermTheme.ts` and `loadXterm.ts`**

```ts
// xtermTheme.ts
import type { ITheme } from '@xterm/xterm';
import { tango, type TangoName } from '@/components/asciiImage';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const NAMES: TangoName[] = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

export function xtermTheme(): ITheme {
  const th: Record<string, string> = {
    foreground: tango('white').normal,
    background: '#00000000',
    cursor: tango('green').bright,
    cursorAccent: '#0C0C0C',
    selectionBackground: tango('blue').normal,
  };
  for (const n of NAMES) {
    th[n] = tango(n).normal;
    th[`bright${cap(n)}`] = tango(n).bright;
  }
  return th as ITheme;
}
```

```ts
// loadXterm.ts — the only static entry to xterm; everything else imports types only.
export interface XtermModules {
  Terminal: typeof import('@xterm/xterm').Terminal;
  FitAddon: typeof import('@xterm/addon-fit').FitAddon;
  WebLinksAddon: typeof import('@xterm/addon-web-links').WebLinksAddon;
  UnicodeGraphemesAddon: typeof import('@xterm/addon-unicode-graphemes').UnicodeGraphemesAddon;
}

let cached: Promise<XtermModules> | null = null;

export function loadXterm(): Promise<XtermModules> {
  cached ??= Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
    import('@xterm/addon-unicode-graphemes'),
    import('@xterm/xterm/css/xterm.css'),
  ]).then(([x, fit, links, graphemes]) => ({
    Terminal: x.Terminal,
    FitAddon: fit.FitAddon,
    WebLinksAddon: links.WebLinksAddon,
    UnicodeGraphemesAddon: graphemes.UnicodeGraphemesAddon,
  })).catch((err) => {
    cached = null;
    throw err;
  });
  return cached;
}
```

If TypeScript rejects `typeof import('@xterm/addon-unicode-graphemes')` because the package ships no types for that export name, read its `.d.ts` in `node_modules` and use the real exported class name.

- [ ] **Step 5: Run the theme test** → PASS.

- [ ] **Step 6: Thai spike (throwaway)** — create `app/src/shell/__spike__/ThaiSpike.tsx` that loads xterm via `loadXterm()`, activates `UnicodeGraphemesAddon` (`term.loadAddon(new UnicodeGraphemesAddon()); term.unicode.activeVersion = '15-graphemes'` — use the version string the addon documents), and writes:

```
สวัสดีครับ ยินดีต้อนรับสู่เว็บไซต์ของฉัน
พิมพ์ 'help' เพื่อดูคำสั่งทั้งหมด
ไม่พบไฟล์หรือไดเรกทอรี: ~/projects/xyz
โปรเจกต์: ระบบจัดการงาน Kanban — ลดภาระงานลง 50%
```
with a cursor after the last line. Mount it on a temporary route `/__spike` in `App.tsx`, run `npm run dev -- --port 3100`, screenshot with Playwright at 1440 and 390 width to `.superpowers/sdd/2026-10-09-ascii-terminal-cms/screens/t-shell-1-thai-*.png`, and view them.
Decision rule: **ok** if every vowel/tone mark sits on its base consonant, no glyph overlaps the next cell, and the cursor lands right after the text; otherwise **english**.

- [ ] **Step 7: Record decision and remove spike** — append `SHELL_THAI=ok` or `SHELL_THAI=english` (with one sentence of evidence) to the progress ledger; delete `__spike__/` and the temporary route. `git status` must show no spike files.

- [ ] **Step 8: Verify and commit**

Run: `npm run lint && npm test -- --run && npm run build` → all pass; `grep -l "xterm" dist/assets/index-*.js` → no match (xterm not in entry chunk).

```bash
git add app/package.json app/package-lock.json app/src/shell/loadXterm.ts app/src/shell/xtermTheme.ts app/src/shell/xtermTheme.test.ts
git commit -m "feat(shell): xterm deps, lazy loader and Tango theme"
```

---

### Task 2: Shared scroll-spy and tmux status bar

**Files:**
- Create: `app/src/hooks/useActiveSection.ts`, `app/src/hooks/useActiveSection.test.tsx`, `app/src/statusbar/constants.ts`, `app/src/statusbar/StatusBar.tsx`, `app/src/statusbar/StatusBar.test.tsx`
- Modify: `app/src/components/Navbar.tsx` (use the hook), `app/src/components/Layout.tsx` (mount bar, bottom padding, toaster offset), `app/src/components/Footer.tsx` (bottom padding if needed), `app/src/i18n/translations.ts` (`statusBar` keys en+th)

**Interfaces:**
- Produces:
  - `export const SECTIONS = ['hero', 'about', 'projects', 'skills', 'blog'] as const; export type SectionId = typeof SECTIONS[number];` (in `useActiveSection.ts`)
  - `useActiveSection(): SectionId` — on `/` the last section whose top ≤ 120px (default `'hero'`); on `/blog*` returns `'blog'`; elsewhere `'hero'`.
  - `goToSection(id: SectionId, navigate: NavigateFunction, pathname: string): void` — on `/` calls `document.getElementById(id)?.scrollIntoView({ behavior })` (`behavior` is `'auto'` under reduced motion, else `'smooth'`) and `history.replaceState(null, '', '#'+id)` (hero → `'/'`); elsewhere `navigate('/#'+id)` (hero → `navigate('/')`). `blog` when not on home and no `#blog` element → `navigate('/blog')`.
  - `<StatusBar shellOpen={boolean} onToggleShell={() => void} />` (default export). Bar height constant `STATUS_BAR_PX = 24` exported from `app/src/statusbar/constants.ts` (not from the component file — `react-refresh/only-export-components` would fail lint).
- Consumes: `useI18n()` (`lang`, `setLang`, `t`).

- [ ] **Step 1: Failing hook tests** (`useActiveSection.test.tsx`)

```tsx
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useActiveSection, goToSection } from './useActiveSection';

function wrap(path: string) {
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
}
function section(id: string, top: number) {
  const el = document.createElement('section');
  el.id = id;
  el.getBoundingClientRect = () => ({ top } as DOMRect);
  document.body.appendChild(el);
  return el;
}
afterEach(() => { document.body.innerHTML = ''; });

it('picks the last section scrolled past on home', () => {
  section('hero', -800); section('about', -100); section('projects', 400);
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/') });
  expect(result.current).toBe('about');
});

it('updates on scroll', () => {
  const about = section('about', 500);
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/') });
  expect(result.current).toBe('hero');
  about.getBoundingClientRect = () => ({ top: 50 } as DOMRect);
  act(() => { window.dispatchEvent(new Event('scroll')); });
  expect(result.current).toBe('about');
});

it('is blog on blog routes', () => {
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/blog/x') });
  expect(result.current).toBe('blog');
});

it('goToSection navigates home first when off-home', () => {
  const navigate = vi.fn();
  goToSection('skills', navigate, '/blog/x');
  expect(navigate).toHaveBeenCalledWith('/#skills');
});

it('goToSection scrolls in place on home', () => {
  const el = section('skills', 900);
  el.scrollIntoView = vi.fn();
  const navigate = vi.fn();
  goToSection('skills', navigate, '/');
  expect(el.scrollIntoView).toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run** → FAIL (module not found).

- [ ] **Step 3: Implement `useActiveSection.ts`**

```ts
import { useEffect, useState } from 'react';
import { useLocation, type NavigateFunction } from 'react-router-dom';

export const SECTIONS = ['hero', 'about', 'projects', 'skills', 'blog'] as const;
export type SectionId = (typeof SECTIONS)[number];
const OFFSET = 120;

function current(): SectionId {
  let id: SectionId = 'hero';
  for (const s of SECTIONS) {
    const el = document.getElementById(s);
    if (el && el.getBoundingClientRect().top <= OFFSET) id = s;
  }
  return id;
}

export function useActiveSection(): SectionId {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [id, setId] = useState<SectionId>(() => (isHome ? current() : 'hero'));
  useEffect(() => {
    if (!isHome) return;
    const on = () => setId(current());
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [isHome]);
  if (pathname.startsWith('/blog')) return 'blog';
  return isHome ? id : 'hero';
}

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function goToSection(id: SectionId, navigate: NavigateFunction, pathname: string): void {
  if (pathname === '/') {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
      history.replaceState(null, '', id === 'hero' ? '/' : `/#${id}`);
      return;
    }
    if (id === 'blog') { navigate('/blog'); return; }
    return;
  }
  navigate(id === 'hero' ? '/' : `/#${id}`);
}
```

Then replace the inline scroll-spy in `Navbar.tsx` (the `activeSection` state + effect) with `const active = useActiveSection();` and compute each link's `active` as `isHome && active === key`. Existing Navbar tests must still pass.

- [ ] **Step 4: Run hook + Navbar tests** → PASS.

- [ ] **Step 5: Add translations** — in both `en` and `th`:

```ts
statusBar: {
  label: 'Window list',            // th: 'รายการหน้าต่าง'
  windows: { hero: 'home', about: 'about', projects: 'projects', skills: 'skills', blog: 'blog' }, // same in th (command-like names)
  shell: 'shell',                  // th: 'shell'
  openShell: 'Open shell',         // th: 'เปิด shell'
  closeShell: 'Close shell',       // th: 'ปิด shell'
  prev: 'Previous section',        // th: 'ส่วนก่อนหน้า'
  next: 'Next section',            // th: 'ส่วนถัดไป'
},
```

- [ ] **Step 6: Failing StatusBar tests** (`StatusBar.test.tsx`)

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import StatusBar from './StatusBar';

function renderBar(path = '/', props: Partial<{ shellOpen: boolean; onToggleShell: () => void }> = {}) {
  return render(
    <I18nProvider><MemoryRouter initialEntries={[path]}>
      <StatusBar shellOpen={props.shellOpen ?? false} onToggleShell={props.onToggleShell ?? (() => {})} />
    </MemoryRouter></I18nProvider>,
  );
}

it('marks the active window with *', () => {
  renderBar('/blog/x');
  expect(screen.getByRole('button', { name: /4:blog\*/ })).toHaveAttribute('aria-current', 'true');
});

it('clicking a window navigates home to that section', async () => {
  function Loc() { const l = useLocation(); return <div data-testid="loc">{l.pathname + l.hash}</div>; }
  render(<I18nProvider><MemoryRouter initialEntries={['/blog/x']}><StatusBar shellOpen={false} onToggleShell={() => {}} /><Loc /></MemoryRouter></I18nProvider>);
  await userEvent.click(screen.getByRole('button', { name: /3:skills/ }));
  expect(screen.getByTestId('loc')).toHaveTextContent('/#skills');
});

it('toggles the shell and reflects state', async () => {
  const onToggle = vi.fn();
  renderBar('/', { shellOpen: true, onToggleShell: onToggle });
  const btn = screen.getByRole('button', { name: /close shell/i });
  expect(btn).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(btn);
  expect(onToggle).toHaveBeenCalledOnce();
});

it('switches language', async () => {
  renderBar('/');
  await userEvent.click(screen.getByRole('button', { name: /^TH$/ }));
  expect(document.documentElement.lang).toBe('th');
});
```

- [ ] **Step 7: Run** → FAIL.

- [ ] **Step 8: Implement `StatusBar.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { SECTIONS, goToSection, useActiveSection } from '@/hooks/useActiveSection';
import { STATUS_BAR_PX } from './constants';
// constants.ts: export const STATUS_BAR_PX = 24;

function useClock(): string {
  const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => { setNow(fmt()); id = setTimeout(tick, 60_000 - (Date.now() % 60_000)); };
    id = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    return () => clearTimeout(id);
  }, []);
  return now;
}

export default function StatusBar({ shellOpen, onToggleShell }: { shellOpen: boolean; onToggleShell: () => void }) {
  const { t, lang, setLang } = useI18n();
  const active = useActiveSection();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const clock = useClock();
  const idx = SECTIONS.indexOf(active);
  const go = (i: number) => goToSection(SECTIONS[(i + SECTIONS.length) % SECTIONS.length], navigate, pathname);

  return (
    <nav aria-label={t.statusBar.label}
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-2 font-mono text-[12px] leading-none bg-ansi-green text-bg"
      style={{ height: STATUS_BAR_PX }}>
      <span aria-hidden="true">[prommin]</span>
      <span className="hidden sm:flex gap-3">
        {SECTIONS.map((s, i) => (
          <button key={s} type="button" aria-current={s === active ? 'true' : undefined}
            className={s === active ? 'font-bold' : ''} onClick={() => go(i)}>
            {i}:{t.statusBar.windows[s]}{s === active ? '*' : ''}
          </button>
        ))}
      </span>
      <span className="flex sm:hidden gap-2 items-center">
        <span>[{idx}:{t.statusBar.windows[active]}*]</span>
        <button type="button" aria-label={t.statusBar.prev} onClick={() => go(idx - 1)}>‹</button>
        <button type="button" aria-label={t.statusBar.next} onClick={() => go(idx + 1)}>›</button>
      </span>
      <span className="ml-auto flex items-center gap-3">
        <button type="button" aria-pressed={shellOpen} onClick={onToggleShell}
          aria-label={shellOpen ? t.statusBar.closeShell : t.statusBar.openShell}
          className={shellOpen ? 'font-bold underline' : ''}>&gt;_ {t.statusBar.shell}</button>
        <span aria-hidden="true">│</span>
        <span className="flex gap-1">
          {(['en', 'th'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
              className={lang === l ? 'font-bold' : 'opacity-70'}>{l.toUpperCase()}</button>
          ))}
        </span>
        <span aria-hidden="true" className="hidden sm:inline">│ {clock}</span>
      </span>
    </nav>
  );
}
```

- [ ] **Step 9: Mount in `Layout.tsx`** — hold `const [shellOpen, setShellOpen] = useState(false)` for now (Task 6 replaces it with `useShell()`); render `<StatusBar shellOpen={shellOpen} onToggleShell={() => setShellOpen(o => !o)} />` after `<Footer />`; give the outer div `style={{ paddingBottom: STATUS_BAR_PX }}`; set the toaster `offset={STATUS_BAR_PX + 16}` (sonner prop) so toasts sit above the bar.

- [ ] **Step 10: Layout test** — extend `app/src/components/Layout.test.tsx` with: renders a `nav` named "Window list", and the root container has `padding-bottom: 24px`.

- [ ] **Step 11: Run full suite** — `npm run lint && npm test -- --run && npm run build` → pass.

- [ ] **Step 12: Visual check** — dev server on :3100 proxied to the Go server (`VITE_API_TARGET` is not available; temporarily set `server.proxy` targets in a throwaway `vite.config.local.ts` copy to `http://localhost:8095`, delete afterwards). Screenshots at 1440 and 390, top and fully scrolled to the footer, to `screens/t-shell-2-*.png`. Confirm the footer links are fully visible above the bar. View them.

- [ ] **Step 13: Commit**

```bash
git add app/src/hooks app/src/statusbar app/src/components/Navbar.tsx app/src/components/Layout.tsx app/src/components/Layout.test.tsx app/src/components/Footer.tsx app/src/i18n/translations.ts
git commit -m "feat(app): tmux-style status bar with shared scroll-spy"
```

---

### Task 3: Shell core — ANSI helpers, parser, virtual filesystem, completion

**Files:**
- Create: `app/src/data/skills.ts`, `app/src/shell/types.ts`, `app/src/shell/ansi.ts`, `app/src/shell/parse.ts`, `app/src/shell/fs.ts`, `app/src/shell/suggest.ts`, `app/src/shell/complete.ts` and a `*.test.ts` for each of ansi, parse, fs, suggest, complete
- Modify: `app/src/sections/SkillsSection.tsx` (import data from `@/data/skills`)

**Interfaces:**
- Produces (exact):

```ts
// data/skills.ts
export interface SkillCategory { key: 'backend' | 'frontend' | 'databases' | 'devopsTesting' | 'cloudIntegrations'; dir: string; skills: string[] }
export const SKILL_CATEGORIES: readonly SkillCategory[]; // same content as today, dir = 'backend' | 'frontend' | 'databases' | 'devops-testing' | 'cloud-integrations'

// shell/types.ts
import type { Project, PostSummary, Post } from '@/lib/types';
import type { Language, Translations } from '@/i18n/translations';
import type { SectionId } from '@/hooks/useActiveSection';
export type ShellOutput = string[];                // lines, may contain ANSI SGR + OSC-8
export interface ShellData {
  projects(signal?: AbortSignal): Promise<Project[]>;
  posts(signal?: AbortSignal): Promise<PostSummary[]>;   // all published posts (paged through)
  post(slug: string, signal?: AbortSignal): Promise<Post | null>; // null on 404
}
export interface ShellContext {
  t: Translations; lang: Language; cwd: string; history: readonly string[];
  data: ShellData; signal: AbortSignal;
  setCwd(path: string): void; setLang(l: Language): void;
  goSection(id: SectionId): void; navigate(path: string): void; openExternal(url: string): void;
  clear(): void; close(): void;
}
export interface Command { name: string; summary: (t: Translations) => string; run(args: string[], ctx: ShellContext): Promise<ShellOutput> | ShellOutput }

// shell/ansi.ts
export function color(text: string, name: TangoName, bright?: boolean): string;  // SGR 30-37 / 90-97 + reset
export function bold(text: string): string;
export function link(url: string, text: string): string;                          // OSC 8
export function stripAnsi(s: string): string;
export function visibleWidth(s: string): number;  // stripAnsi then count grapheme clusters via Intl.Segmenter; East Asian wide not needed

// shell/parse.ts
export interface Parsed { cmd: string; args: string[] }
export function parse(line: string): Parsed | null;   // null for empty/whitespace; supports '..' and ".." quotes and backslash escapes

// shell/fs.ts
export type Node = { kind: 'dir'; name: string; children: () => Promise<Node[]> } | { kind: 'file'; name: string; ref: FileRef };
export type FileRef = { type: 'about' } | { type: 'skill'; category: string; skill: string } | { type: 'project'; slug: string } | { type: 'post'; slug: string };
export const HOME = '~';
export function normalize(input: string, cwd: string): string;   // → '~' or '~/a/b'; handles '/home/guest', '.', '..', trailing '/'
export function root(data: ShellData, signal?: AbortSignal): Node;   // ~ with about.md, skills/, projects/, blog/
export function resolve(path: string, data: ShellData, signal?: AbortSignal): Promise<Node | null>; // path already normalized

// shell/suggest.ts
export function distance(a: string, b: string): number;  // Levenshtein
export function suggest(word: string, candidates: readonly string[]): string | null; // closest with distance ≤ 2, ties → alphabetical

// shell/complete.ts
export interface Completion { replaceFrom: number; options: string[] }
export function complete(line: string, cursor: number, commands: readonly string[], cwd: string, data: ShellData): Promise<Completion>;
// first word → command names; otherwise → child names of the directory part of the current word (dirs get trailing '/')
```

- [ ] **Step 1: Move skills data** — create `app/src/data/skills.ts` with `SKILL_CATEGORIES` (copy the five categories and their skills from `SkillsSection.tsx`, adding `dir` from its `DIR_NAMES` map); change `SkillsSection.tsx` to import `SKILL_CATEGORIES` and use `c.dir`. Run `npx vitest run src/sections` → PASS (behaviour unchanged).

- [ ] **Step 2: Failing tests** — write these files:

`ansi.test.ts`
```ts
import { color, bold, link, stripAnsi, visibleWidth } from './ansi';
it('wraps colour codes', () => {
  expect(color('ok', 'green')).toBe('\x1b[32mok\x1b[0m');
  expect(color('ok', 'green', true)).toBe('\x1b[92mok\x1b[0m');
  expect(bold('x')).toBe('\x1b[1mx\x1b[0m');
});
it('builds OSC-8 links and strips them', () => {
  const l = link('https://e.com', 'site');
  expect(l).toBe('\x1b]8;;https://e.com\x07site\x1b]8;;\x07');
  expect(stripAnsi(color(l, 'blue'))).toBe('site');
});
it('counts Thai grapheme clusters', () => {
  expect(visibleWidth('ที่')).toBe(1);
  expect(visibleWidth(color('abc', 'red'))).toBe(3);
});
```

`parse.test.ts`
```ts
import { parse } from './parse';
it.each([
  ['', null],
  ['   ', null],
  ['ls', { cmd: 'ls', args: [] }],
  ['  cat   ~/projects/kanban  ', { cmd: 'cat', args: ['~/projects/kanban'] }],
  ['echo "hello world" x', { cmd: 'echo', args: ['hello world', 'x'] }],
  ["echo 'a b'", { cmd: 'echo', args: ['a b'] }],
  ['echo a\\ b', { cmd: 'echo', args: ['a b'] }],
  ['LS', { cmd: 'ls', args: [] }],
])('parse(%j)', (input, expected) => expect(parse(input)).toEqual(expected));
it('treats an unterminated quote as running to end of line', () => {
  expect(parse('echo "abc')).toEqual({ cmd: 'echo', args: ['abc'] });
});
```

`fs.test.ts`
```ts
import { normalize, resolve, root } from './fs';
import type { ShellData } from './types';

const data: ShellData = {
  projects: async () => [{ slug: 'kanban', name: { en: 'Kanban', th: 'คันบัน' }, description: { en: 'd', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: true }],
  posts: async () => [{ slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, tags: [], coverUrl: '', publishedAt: '2026-10-09T00:00:00.000Z' }],
  post: async () => null,
};

it.each([
  ['~', '~', '~'], ['projects', '~', '~/projects'], ['/home/guest/blog', '~', '~/blog'],
  ['..', '~/projects', '~'], ['../blog/', '~/projects', '~/blog'], ['.', '~/skills', '~/skills'],
  ['../..', '~/projects', '~'], ['~/projects/kanban', '~/blog', '~/projects/kanban'],
])('normalize(%j, %j) = %j', (input, cwd, out) => expect(normalize(input, cwd)).toBe(out));

it('lists home', async () => {
  const kids = await (root(data) as Extract<ReturnType<typeof root>, { kind: 'dir' }>).children();
  expect(kids.map((k) => k.name)).toEqual(['about.md', 'skills', 'projects', 'blog']);
});
it('resolves project and post files', async () => {
  expect(await resolve('~/projects/kanban', data)).toMatchObject({ kind: 'file', ref: { type: 'project', slug: 'kanban' } });
  expect(await resolve('~/blog/hello', data)).toMatchObject({ kind: 'file', ref: { type: 'post', slug: 'hello' } });
  expect(await resolve('~/projects/nope', data)).toBeNull();
  expect(await resolve('~/skills/backend', data)).toMatchObject({ kind: 'dir', name: 'backend' });
});
```

`suggest.test.ts`
```ts
import { distance, suggest } from './suggest';
it('levenshtein', () => { expect(distance('ls', 'sl')).toBe(2); expect(distance('cat', 'cat')).toBe(0); });
it('suggests within 2', () => {
  expect(suggest('lss', ['ls', 'cat'])).toBe('ls');
  expect(suggest('hepl', ['help', 'history'])).toBe('help');
  expect(suggest('zzzzz', ['ls'])).toBeNull();
});
```

`complete.test.ts`
```ts
import { complete } from './complete';
import type { ShellData } from './types';
const data: ShellData = {
  projects: async () => [
    { slug: 'kanban', name: { en: 'K', th: '' }, description: { en: '', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: true },
    { slug: 'kafka-lab', name: { en: 'Ka', th: '' }, description: { en: '', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: false },
  ],
  posts: async () => [], post: async () => null,
};
const CMDS = ['cat', 'cd', 'clear', 'help', 'ls'];
it('completes command names', async () => {
  expect(await complete('c', 1, CMDS, '~', data)).toEqual({ replaceFrom: 0, options: ['cat', 'cd', 'clear'] });
});
it('completes directories with a slash', async () => {
  expect(await complete('cd pro', 6, CMDS, '~', data)).toEqual({ replaceFrom: 3, options: ['projects/'] });
});
it('completes slugs inside a path', async () => {
  expect(await complete('cat ~/projects/ka', 17, CMDS, '~', data)).toEqual({ replaceFrom: 15, options: ['kafka-lab', 'kanban'] });
});
it('returns nothing for an unknown directory', async () => {
  expect(await complete('cat ~/nope/x', 12, CMDS, '~', data)).toEqual({ replaceFrom: 11, options: [] });
});
```

- [ ] **Step 3: Run** `npx vitest run src/shell` → FAIL (modules missing).

- [ ] **Step 4: Implement** `types.ts` (exactly as in Interfaces), then:

```ts
// ansi.ts
import type { TangoName } from '@/components/asciiImage';
const ORDER: TangoName[] = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const ESC = '\x1b';
export const color = (text: string, name: TangoName, bright = false) =>
  `${ESC}[${(bright ? 90 : 30) + ORDER.indexOf(name)}m${text}${ESC}[0m`;
export const bold = (text: string) => `${ESC}[1m${text}${ESC}[0m`;
export const link = (url: string, text: string) => `${ESC}]8;;${url}\x07${text}${ESC}]8;;\x07`;
// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*m|\x1b\]8;;[^\x07]*\x07/g;
export const stripAnsi = (s: string) => s.replace(ANSI, '');
const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
export function visibleWidth(s: string): number {
  const plain = stripAnsi(s);
  return seg ? [...seg.segment(plain)].length : [...plain].length;
}
```

```ts
// parse.ts
export interface Parsed { cmd: string; args: string[] }
export function parse(line: string): Parsed | null {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  let has = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = null; else cur += c; continue; }
    if (c === '\\' && i + 1 < line.length) { cur += line[++i]; has = true; continue; }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    if (/\s/.test(c)) { if (has || cur) { out.push(cur); cur = ''; has = false; } continue; }
    cur += c; has = true;
  }
  if (has || cur) out.push(cur);
  if (out.length === 0) return null;
  return { cmd: out[0].toLowerCase(), args: out.slice(1) };
}
```

```ts
// suggest.ts
export function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
export function suggest(word: string, candidates: readonly string[]): string | null {
  let best: string | null = null; let bestD = 3;
  for (const c of [...candidates].sort()) { const d = distance(word, c); if (d < bestD) { best = c; bestD = d; } }
  return best;
}
```

```ts
// fs.ts
import { SKILL_CATEGORIES } from '@/data/skills';
import type { ShellData } from './types';
export type FileRef = { type: 'about' } | { type: 'skill'; category: string; skill: string } | { type: 'project'; slug: string } | { type: 'post'; slug: string };
export type Node = { kind: 'dir'; name: string; children: () => Promise<Node[]> } | { kind: 'file'; name: string; ref: FileRef };
export const HOME = '~';

export function normalize(input: string, cwd: string): string {
  let p = input.trim();
  if (p === '' ) return cwd;
  if (p.startsWith('/home/guest')) p = '~' + p.slice('/home/guest'.length);
  const parts = (p.startsWith('~') ? p.slice(1) : `${cwd.slice(1)}/${p}`).split('/');
  const stack: string[] = [];
  for (const s of parts) {
    if (!s || s === '.') continue;
    if (s === '..') stack.pop(); else stack.push(s);
  }
  return stack.length ? `~/${stack.join('/')}` : '~';
}

const dir = (name: string, children: () => Promise<Node[]>): Node => ({ kind: 'dir', name, children });
const file = (name: string, ref: FileRef): Node => ({ kind: 'file', name, ref });

export function root(data: ShellData, signal?: AbortSignal): Node {
  return dir('~', async () => [
    file('about.md', { type: 'about' }),
    dir('skills', async () => SKILL_CATEGORIES.map((c) =>
      dir(c.dir, async () => c.skills.map((s) => file(s, { type: 'skill', category: c.dir, skill: s }))))),
    dir('projects', async () => (await data.projects(signal)).map((p) => file(p.slug, { type: 'project', slug: p.slug }))),
    dir('blog', async () => (await data.posts(signal)).map((p) => file(p.slug, { type: 'post', slug: p.slug }))),
  ]);
}

export async function resolve(path: string, data: ShellData, signal?: AbortSignal): Promise<Node | null> {
  let node: Node = root(data, signal);
  if (path === '~') return node;
  for (const seg of path.slice(2).split('/')) {
    if (node.kind !== 'dir') return null;
    const next: Node | undefined = (await node.children()).find((c) => c.name === seg);
    if (!next) return null;
    node = next;
  }
  return node;
}
```

```ts
// complete.ts
import { normalize, resolve } from './fs';
import type { ShellData } from './types';
export interface Completion { replaceFrom: number; options: string[] }
export async function complete(line: string, cursor: number, commands: readonly string[], cwd: string, data: ShellData): Promise<Completion> {
  const before = line.slice(0, cursor);
  const start = before.lastIndexOf(' ') + 1;
  const word = before.slice(start);
  if (start === 0 || before.trimStart() === word) {
    return { replaceFrom: start, options: commands.filter((c) => c.startsWith(word.toLowerCase())).sort() };
  }
  const slash = word.lastIndexOf('/');
  const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
  const prefix = slash >= 0 ? word.slice(slash + 1) : word;
  const node = await resolve(normalize(dirPart || '.', cwd), data).catch(() => null);
  const replaceFrom = start + dirPart.length;
  if (!node || node.kind !== 'dir') return { replaceFrom, options: [] };
  const kids = await node.children().catch(() => []);
  return { replaceFrom, options: kids.filter((k) => k.name.startsWith(prefix)).map((k) => (k.kind === 'dir' ? `${k.name}/` : k.name)).sort() };
}
```

(Note `normalize('~/', cwd)` → `'~'`, and the `~/nope/` case resolves to null → `{ replaceFrom: 11, options: [] }`.)

- [ ] **Step 5: Run** `npx vitest run src/shell src/sections` → PASS; then `npm run lint && npm run build`.

- [ ] **Step 6: Commit**

```bash
git add app/src/data app/src/shell app/src/sections/SkillsSection.tsx
git commit -m "feat(shell): parser, virtual filesystem, completion and ANSI helpers"
```

---

### Task 4: Shell commands

**Files:**
- Create: `app/src/shell/commands/{index,help,ls,cat,tree,whoami,echo,date,history,clear,lang,cd,open,exit}.ts`, `app/src/shell/commands/commands.test.ts`, `app/src/shell/testCtx.ts` (test helper, not shipped by imports)
- Modify: `app/src/i18n/translations.ts` (`shell` keys en+th)

**Interfaces:**
- Consumes: everything from Task 3; `pick()` from `@/lib/pick`; `SKILL_CATEGORIES`; `SECTIONS`, `SectionId`.
- Produces:
  - `COMMANDS: readonly Command[]` and `COMMAND_NAMES: readonly string[]` from `commands/index.ts`.
  - `run(line: string, ctx: ShellContext): Promise<ShellOutput>` — parses, dispatches, catches errors: `AbortError` → `['^C']`; any other error → `[color(t.shell.networkError, 'red', true)]`; unknown command → `bash: <cmd>: command not found` plus, when `suggest` finds one, `t.shell.didYouMean.replace('{cmd}', s)`.
  - `makeTestCtx(overrides?: Partial<ShellContext>): ShellContext & { calls: Record<string, unknown[][]> }` in `testCtx.ts` — records calls to `setCwd/setLang/goSection/navigate/openExternal/clear/close`, uses English translations, cwd `~`, data with one flagship project `kanban` (repoUrl `https://github.com/x/kanban`), one project `docs` with no repo, one post `hello`.

Translations to add (en; th translated, keep `{cmd}`, `{path}` placeholders):
```ts
shell: {
  welcome: "Welcome to prommin's shell.",       // th: 'ยินดีต้อนรับสู่ shell ของ prommin'
  hint: "type 'help' to get started",          // th: "พิมพ์ 'help' เพื่อเริ่มต้น"
  heroHint: 'press ` to open a shell',          // th: 'กด ` เพื่อเปิด shell'
  heroHintTouch: 'tap >_ shell to open a shell',// th: 'แตะ >_ shell เพื่อเปิด shell'
  notFound: 'command not found',               // th: 'ไม่พบคำสั่ง'
  didYouMean: "did you mean '{cmd}'?",          // th: "หมายถึง '{cmd}' หรือเปล่า?"
  noSuchFile: '{path}: No such file or directory', // th: '{path}: ไม่พบไฟล์หรือไดเรกทอรี'
  notADir: '{path}: Not a directory',           // th: '{path}: ไม่ใช่ไดเรกทอรี'
  isADir: '{path}: Is a directory',             // th: '{path}: เป็นไดเรกทอรี'
  usage: 'usage: {cmd}',                        // th: 'วิธีใช้: {cmd}'
  networkError: 'error: network unreachable (try again)', // th: 'ข้อผิดพลาด: เชื่อมต่อเครือข่ายไม่ได้ (ลองใหม่)'
  openToRead: "run 'open {path}' to read it",   // th: "พิมพ์ 'open {path}' เพื่ออ่าน"
  opening: 'opening {path}…',                   // th: 'กำลังเปิด {path}…'
  noRepo: '{path}: no public repository — showing the card', // th: '{path}: ไม่มี repository สาธารณะ — แสดงการ์ดแทน'
  langSet: 'language set to {lang}',            // th: 'ตั้งภาษาเป็น {lang} แล้ว'
  loadFailed: 'failed to load the terminal',    // th: 'โหลด terminal ไม่สำเร็จ'
  retry: 'retry',                               // th: 'ลองใหม่'
  title: 'Shell',                               // th: 'Shell'
  help: { help: 'list commands', ls: 'list directory contents', cat: 'print a file', tree: 'show a directory tree',
          whoami: 'who am I?', echo: 'print text', date: 'print the date', history: 'show command history',
          clear: 'clear the screen', lang: 'switch language: lang en|th', cd: 'go to a section or directory',
          open: 'open a post or project', exit: 'close the shell' },
  // th help: 'แสดงคำสั่งทั้งหมด', 'แสดงรายการในไดเรกทอรี', 'แสดงเนื้อหาไฟล์', 'แสดงโครงสร้างไดเรกทอรี', 'ฉันคือใคร?',
  //          'พิมพ์ข้อความ', 'แสดงวันที่', 'แสดงประวัติคำสั่ง', 'ล้างหน้าจอ', 'สลับภาษา: lang en|th',
  //          'ไปยังส่วนหรือไดเรกทอรี', 'เปิดบทความหรือโปรเจกต์', 'ปิด shell'
},
```
If the Task 1 ledger says `SHELL_THAI=english`, `useShellContext` (Task 6) passes `translations.en` as `ctx.t` regardless of site language; the `th` keys are still required for parity.

Command behaviour (each file exports one `Command`):
- `help` → one line per command: `bold(name.padEnd(8))` + summary, then `t.shell.hint`.
- `ls [path]` → resolve `normalize(arg ?? '.', cwd)`; dir → names joined by two spaces, dirs `color(name+'/', 'blue', true)`, flagship projects suffixed ` ` + `color('[★]', 'yellow', true)`; file → its name; missing → `ls: ` + noSuchFile.
- `cat <path>` → no arg → `usage: cat <file>`; dir → `cat: ` + isADir; about → `t.about.bio1/bio2/bio3` as separate lines; skill → `<skill> (<category>)`; project → `bold(pick(name))`, description, `tags` as `color('[tag]','magenta',true)` joined by space, metric `color('>> '+metric,'yellow',true)` if set, `link(repoUrl, repoUrl)` if set; post → `bold(title)`, `color(date YYYY-MM-DD,'yellow',true)`, excerpt, then `openToRead`. Missing → `cat: ` + noSuchFile.
- `tree [path]` → directory tree with `├── ` / `└── ` / `│   ` prefixes, depth ≤ 2, ending with `N directories, M files`.
- `whoami` → `guest`, then `t.hero.tagline`, then `link('https://github.com/prommin01st-lang', 'github.com/prommin01st-lang')`.
- `echo …` → args joined by a space. `date` → `new Date().toString()`. `history` → numbered `ctx.history`. `clear` → calls `ctx.clear()`, returns `[]`.
- `lang en|th` → `ctx.setLang`, returns `langSet`; other → `usage: lang en|th`.
- `cd [target]` → no arg or `~` → `ctx.setCwd('~')`, `ctx.goSection('hero')`. If target (lower-cased, trailing `/` removed, leading `~/` removed) is one of `about|projects|skills|blog|home|hero` → `ctx.goSection(...)` (`home` → `hero`) and, for `projects|skills|blog`, `ctx.setCwd('~/'+target)`. Otherwise resolve as a path: dir → `ctx.setCwd(path)`; file → `cd: ` + notADir; missing → `cd: ` + noSuchFile. Returns `[]` on success.
- `open <path|url>` → no arg → usage. `http(s)://…` → `ctx.openExternal(url)`. Resolve path (bare slug allowed: try `~/blog/<x>` then `~/projects/<x>`): post → `ctx.navigate('/blog/'+slug)`, `ctx.close()`, return `opening`; project with repoUrl → `ctx.openExternal(repoUrl)`, return `opening`; project without repo → `ctx.goSection('projects')`, `ctx.close()`, return `noRepo`; missing → `open: ` + noSuchFile.
- `exit` → `ctx.close()`, returns `[]`.

- [ ] **Step 1: Write `testCtx.ts`** (helper as specified in Interfaces; `data.projects/posts/post` are `vi.fn` async; `post('hello')` returns a full Post, others `null`).

- [ ] **Step 2: Failing tests** (`commands.test.ts`) — cover at minimum:

```ts
import { run } from './index';
import { makeTestCtx } from '../testCtx';
import { stripAnsi } from '../ansi';
const plain = (lines: string[]) => lines.map(stripAnsi);

it('unknown command suggests the closest', async () => {
  expect(plain(await run('lss', makeTestCtx()))).toEqual(['bash: lss: command not found', "did you mean 'ls'?"]);
});
it('empty line prints nothing', async () => { expect(await run('   ', makeTestCtx())).toEqual([]); });
it('ls ~ lists home with dirs coloured', async () => {
  expect(plain(await run('ls', makeTestCtx()))).toEqual(['about.md  skills/  projects/  blog/']);
});
it('ls projects marks flagship', async () => {
  expect(plain(await run('ls projects', makeTestCtx()))[0]).toContain('kanban [★]');
});
it('cat a project shows tags and repo link', async () => {
  const out = await run('cat ~/projects/kanban', makeTestCtx());
  expect(out.join('\n')).toContain('\x1b]8;;https://github.com/x/kanban');
});
it('cat missing file', async () => {
  expect(plain(await run('cat ~/projects/nope', makeTestCtx()))).toEqual(['cat: ~/projects/nope: No such file or directory']);
});
it('cat a directory', async () => {
  expect(plain(await run('cat projects', makeTestCtx()))).toEqual(['cat: projects: Is a directory']);
});
it('cd section scrolls and sets cwd', async () => {
  const ctx = makeTestCtx();
  await run('cd skills', ctx);
  expect(ctx.calls.goSection).toEqual([['skills']]);
  expect(ctx.calls.setCwd).toEqual([['~/skills']]);
});
it('cd home maps to hero', async () => {
  const ctx = makeTestCtx(); await run('cd', ctx);
  expect(ctx.calls.goSection).toEqual([['hero']]);
});
it('cd into a file errors', async () => {
  expect(plain(await run('cd ~/projects/kanban', makeTestCtx()))).toEqual(['cd: ~/projects/kanban: Not a directory']);
});
it('cd to a missing dir errors, no navigation', async () => {
  const ctx = makeTestCtx();
  expect(plain(await run('cd nowhere', ctx))).toEqual(['cd: nowhere: No such file or directory']);
  expect(ctx.calls.goSection ?? []).toEqual([]);
});
it('open post navigates and closes', async () => {
  const ctx = makeTestCtx(); await run('open hello', ctx);
  expect(ctx.calls.navigate).toEqual([['/blog/hello']]);
  expect(ctx.calls.close).toHaveLength(1);
});
it('open project with repo opens externally', async () => {
  const ctx = makeTestCtx(); await run('open kanban', ctx);
  expect(ctx.calls.openExternal).toEqual([['https://github.com/x/kanban']]);
});
it('open project without repo falls back to the card', async () => {
  const ctx = makeTestCtx(); await run('open docs', ctx);
  expect(ctx.calls.goSection).toEqual([['projects']]);
});
it('network failure prints the error line', async () => {
  const ctx = makeTestCtx(); (ctx.data.projects as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('x'));
  expect(plain(await run('ls projects', ctx))).toEqual(['error: network unreachable (try again)']);
});
it('abort prints ^C', async () => {
  const ac = new AbortController(); const ctx = makeTestCtx({ signal: ac.signal });
  (ctx.data.projects as ReturnType<typeof vi.fn>).mockImplementation((s?: AbortSignal) => new Promise((_, rej) => s?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))));
  const p = run('ls projects', ctx); ac.abort();
  expect(await p).toEqual(['^C']);
});
it('lang switches', async () => {
  const ctx = makeTestCtx(); await run('lang th', ctx);
  expect(ctx.calls.setLang).toEqual([['th']]);
});
it('help lists every command', async () => {
  const out = plain(await run('help', makeTestCtx())).join('\n');
  for (const n of ['help', 'ls', 'cat', 'tree', 'whoami', 'cd', 'open', 'exit']) expect(out).toContain(n);
});
it('tree skills summarises', async () => {
  expect(plain(await run('tree ~/skills', makeTestCtx())).at(-1)).toMatch(/^5 directories, \d+ files$/);
});
```
(`makeTestCtx` must pass `signal` through to `data.*` calls, and `fs.root` must pass it on.)

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: Implement** `commands/index.ts`:

```ts
import { parse } from '../parse';
import { suggest } from '../suggest';
import { color } from '../ansi';
import type { Command, ShellContext, ShellOutput } from '../types';
import help from './help'; import ls from './ls'; import cat from './cat'; import tree from './tree';
import whoami from './whoami'; import echo from './echo'; import date from './date'; import history from './history';
import clear from './clear'; import lang from './lang'; import cd from './cd'; import open from './open'; import exit from './exit';

export const COMMANDS: readonly Command[] = [help, ls, cat, tree, whoami, echo, date, history, clear, lang, cd, open, exit];
export const COMMAND_NAMES: readonly string[] = COMMANDS.map((c) => c.name);

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

export async function run(line: string, ctx: ShellContext): Promise<ShellOutput> {
  const p = parse(line);
  if (!p) return [];
  const cmd = COMMANDS.find((c) => c.name === p.cmd);
  if (!cmd) {
    const s = suggest(p.cmd, COMMAND_NAMES);
    return [`bash: ${p.cmd}: ${ctx.t.shell.notFound}`, ...(s ? [ctx.t.shell.didYouMean.replace('{cmd}', s)] : [])];
  }
  try {
    return await cmd.run(p.args, ctx);
  } catch (e) {
    if (isAbort(e) || ctx.signal.aborted) return ['^C'];
    return [color(ctx.t.shell.networkError, 'red', true)];
  }
}
```
Note: the "command not found" line keeps English `command not found` in the English test; with Thai it uses `t.shell.notFound`. Implement each command file per the behaviour list, e.g.:

```ts
// commands/cd.ts
import { normalize, resolve } from '../fs';
import type { Command } from '../types';
import type { SectionId } from '@/hooks/useActiveSection';
const SECTION_ALIASES: Record<string, SectionId> = { about: 'about', projects: 'projects', skills: 'skills', blog: 'blog', home: 'hero', hero: 'hero' };
const DIR_SECTIONS = new Set(['projects', 'skills', 'blog']);
const cd: Command = {
  name: 'cd',
  summary: (t) => t.shell.help.cd,
  async run(args, ctx) {
    const raw = args[0];
    if (!raw || raw === '~' || raw === '~/') { ctx.setCwd('~'); ctx.goSection('hero'); return []; }
    const key = raw.toLowerCase().replace(/^~\//, '').replace(/\/$/, '');
    const section = SECTION_ALIASES[key];
    if (section) { if (DIR_SECTIONS.has(key)) ctx.setCwd(`~/${key}`); ctx.goSection(section); return []; }
    const path = normalize(raw, ctx.cwd);
    const node = await resolve(path, ctx.data, ctx.signal);
    if (!node) return [`cd: ${ctx.t.shell.noSuchFile.replace('{path}', raw)}`];
    if (node.kind !== 'dir') return [`cd: ${ctx.t.shell.notADir.replace('{path}', raw)}`];
    ctx.setCwd(path);
    return [];
  },
};
export default cd;
```
Error messages show the argument **as typed** (`raw`), matching the tests.

- [ ] **Step 5: Run** `npx vitest run src/shell` → PASS. Then `npm run lint && npm test -- --run && npm run build`.

- [ ] **Step 6: Commit**

```bash
git add app/src/shell app/src/i18n/translations.ts
git commit -m "feat(shell): commands (help, ls, cat, tree, cd, open, …)"
```

---

### Task 5: Readline line editor

**Files:**
- Create: `app/src/shell/readline.ts`, `app/src/shell/readline.test.ts`

**Interfaces:**
- Consumes: `complete()`, `visibleWidth()`, `COMMAND_NAMES` (passed in), `ShellOutput`.
- Produces:

```ts
export interface TermPort { write(data: string): void; readonly cols: number }
export interface ReadlineOptions {
  port: TermPort;
  prompt: () => string;                               // ANSI prompt, e.g. guest@prommin:~$
  onLine: (line: string, signal: AbortSignal) => Promise<string[]>; // runs a command, returns output lines
  complete: (line: string, cursor: number) => Promise<{ replaceFrom: number; options: string[] }>;
  onClear: () => void;                                // Ctrl+L
  history: string[];                                  // mutable, newest last; caller persists
  spinner?: boolean;                                  // default true; false under reduced motion → static "…"
}
export interface Readline { feed(data: string): void; showPrompt(): void; readonly busy: boolean; dispose(): void }
export function createReadline(o: ReadlineOptions): Readline;
```

Key handling in `feed(data)` (data is xterm `onData` input):
- Printable text (including a pasted chunk): when not busy, insert at cursor with `\r\n`/`\n`/`\r` replaced by a single space and other control chars removed; redraw.
- `\r` (Enter) alone: write `\r\n`; if the line is non-blank push to history (skip if equal to last, cap 100); set busy; start spinner after 150 ms (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` at 80 ms, written as `\b`-replaced single char); await `onLine`; stop spinner; write each output line + `\r\n`; clear busy; show prompt.
- `\x7f` Backspace, `\x1b[3~` Delete, `\x1b[D`/`\x1b[C` ←/→, `\x1b[H`/`\x1bOH`/`\x01` Home, `\x1b[F`/`\x1bOF`/`\x05` End, `\x1b[A`/`\x1b[B` history up/down (keeps the unsent draft), `\x15` Ctrl+U clear line.
- `\t` Tab: one option → replace word; several → common prefix, and on a second consecutive Tab print options in columns (`port.cols`) then redraw prompt + line.
- `\x03` Ctrl+C: if busy → abort the controller (output `^C` comes from `run`); else write `^C\r\n`, clear line, show prompt.
- `\x0c` Ctrl+L: call `onClear()`, then show prompt with the current line.
- Ignored while busy except Ctrl+C.
- Redraw = `\r\x1b[2K` + prompt + line, then move cursor left by `visibleWidth(line.slice(cursor))` columns with `\x1b[<n>D`.

- [ ] **Step 1: Failing tests** (`readline.test.ts`) using a fake port that records writes and helper `screen()` that returns the last redrawn line (`stripAnsi` of text after the last `\x1b[2K`):

```ts
import { createReadline } from './readline';
import { stripAnsi } from './ansi';

function setup(over: Partial<Parameters<typeof createReadline>[0]> = {}) {
  const writes: string[] = [];
  const lines: string[] = [];
  const history: string[] = [];
  const rl = createReadline({
    port: { write: (d) => writes.push(d), cols: 80 },
    prompt: () => '$ ',
    onLine: async (l) => { lines.push(l); return [`ran ${l}`]; },
    complete: async (line) => (line.startsWith('c') ? { replaceFrom: 0, options: ['cat', 'cd'] } : { replaceFrom: 0, options: [] }),
    onClear: vi.fn(),
    history,
    spinner: false,
    ...over,
  });
  rl.showPrompt();
  const screen = () => { const all = writes.join(''); return stripAnsi(all.slice(all.lastIndexOf('\x1b[2K') + 4)).split('\r\n')[0]; };
  return { rl, writes, lines, history, screen };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

it('types and runs a line', async () => {
  const s = setup(); s.rl.feed('ls'); s.rl.feed('\r'); await flush();
  expect(s.lines).toEqual(['ls']);
  expect(s.writes.join('')).toContain('ran ls');
  expect(s.history).toEqual(['ls']);
});
it('paste with newlines does not run multiple commands', async () => {
  const s = setup(); s.rl.feed('ls\ncat x\r\n'); await flush();
  expect(s.lines).toEqual([]);
  expect(s.screen()).toBe('$ ls cat x ');
});
it('edits in the middle with arrows and backspace', () => {
  const s = setup(); s.rl.feed('lxs'); s.rl.feed('\x1b[D'); s.rl.feed('\x7f');
  expect(s.screen()).toBe('$ ls');
});
it('history up/down keeps the draft', async () => {
  const s = setup(); s.rl.feed('ls\r'); await flush();
  s.rl.feed('ca'); s.rl.feed('\x1b[A'); expect(s.screen()).toBe('$ ls');
  s.rl.feed('\x1b[B'); expect(s.screen()).toBe('$ ca');
});
it('tab completes the common prefix then lists on second tab', async () => {
  const s = setup(); s.rl.feed('c'); s.rl.feed('\t'); await flush();
  expect(s.screen()).toBe('$ c');
  s.rl.feed('\t'); await flush();
  expect(s.writes.join('')).toMatch(/cat\s+cd/);
});
it('ctrl+c clears an idle line', () => {
  const s = setup(); s.rl.feed('abc'); s.rl.feed('\x03');
  expect(s.writes.join('')).toContain('^C');
  expect(s.screen()).toBe('$ ');
});
it('ctrl+c aborts a running command', async () => {
  let seen: AbortSignal | undefined;
  const s = setup({ onLine: (_l, sig) => { seen = sig; return new Promise((res) => sig.addEventListener('abort', () => res(['^C']))); } });
  s.rl.feed('ls\r'); s.rl.feed('\x03'); await flush();
  expect(seen?.aborted).toBe(true);
  expect(s.rl.busy).toBe(false);
});
it('ignores typing while busy', async () => {
  let release!: () => void;
  const s = setup({ onLine: () => new Promise((res) => { release = () => res([]); }) });
  s.rl.feed('ls\r'); s.rl.feed('zzz'); release(); await flush();
  expect(s.screen()).toBe('$ ');
});
it('ctrl+l calls onClear', () => {
  const onClear = vi.fn(); const s = setup({ onClear }); s.rl.feed('\x0c');
  expect(onClear).toHaveBeenCalled();
});
it('dedupes and caps history', async () => {
  const s = setup(); for (let i = 0; i < 105; i++) { s.rl.feed(`echo ${i}\r`); await flush(); }
  s.rl.feed('echo 104\r'); await flush();
  expect(s.history).toHaveLength(100);
  expect(s.history.at(-1)).toBe('echo 104');
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `readline.ts`** per the key table above (single closure holding `line`, `cursor`, `histIdx`, `draft`, `busy`, `controller`, `lastWasTab`, `spinnerTimer`). Keep it under ~200 lines; no xterm import.

- [ ] **Step 4: Run** `npx vitest run src/shell/readline.test.ts` → PASS; full `npm run lint && npm test -- --run`.

- [ ] **Step 5: Commit**

```bash
git add app/src/shell/readline.ts app/src/shell/readline.test.ts
git commit -m "feat(shell): readline line editor with history, completion and Ctrl keys"
```

---

### Task 6: Quake shell panel, provider, entry points

**Files:**
- Create: `app/src/shell/ShellProvider.tsx`, `app/src/shell/useShell.ts`, `app/src/shell/QuakeShell.tsx`, `app/src/shell/useShellContext.ts`, `app/src/shell/ShellProvider.test.tsx`, `app/src/shell/QuakeShell.test.tsx`
- Modify: `app/src/components/Layout.tsx` (wrap in provider, use `useShell()` for the status bar), `app/src/components/Navbar.tsx` (`[ >_ shell ]` button, desktop + mobile overlay), `app/src/sections/HeroSection.tsx` (hint line), `app/src/components/term/TerminalWindow.tsx` (optional `onClose?: () => void` makes the `×` a real button only when provided), `app/src/components/term/TerminalWindow.test.tsx`

**Interfaces:**
- Consumes: `loadXterm`, `xtermTheme`, `createReadline`, `run`, `COMMAND_NAMES`, `complete`, `goToSection`, `useI18n`, `useQueryClient`, `api`, `TerminalWindow`, `LoadingBar`, `ErrorLine`, `SHELL_THAI` ledger decision.
- Produces:
  - `<ShellProvider>{children}</ShellProvider>` (default export of `ShellProvider.tsx`) and `useShell(): { open: boolean; toggle(): void; openShell(opener?: HTMLElement | null): void; close(): void }` exported from `app/src/shell/useShell.ts` together with the `ShellCtx` React context object — hooks/contexts live outside component files so `react-refresh/only-export-components` stays clean.
  - `TerminalWindow` gains `onClose?: () => void` → renders the close glyph as `<button type="button" aria-label={closeLabel}>` (prop `closeLabel?: string`); without `onClose` the buttons stay decorative and `aria-hidden` (existing tests unchanged).
  - `useShellContext(state): Omit<ShellContext, 'signal'>` where `state = { cwd, setCwd, history, clear, close }`; data accessors use `queryClient.fetchQuery` with keys `['projects']`, `['posts', { page, perPage: 50 }]` (loops pages until `page*perPage >= total`), `['post', slug]` (404 `ApiError` → `null`), each passing `signal` to a `queryFn` that calls the api and rejects with `AbortError` when aborted.

Behaviour:
- Shortcut: `keydown` on `window` for `` ` `` (`e.key === '`'`) with no Alt/Meta and not inside `input, textarea, select, [contenteditable=""], [contenteditable="true"]` and not when `e.defaultPrevented` → `preventDefault()` + toggle. While the panel is open, xterm has focus, so the readline receives keys; `` ` `` typed inside the shell closes it (handled by the panel: when readline line is empty and data === '`'); `Escape` closes.
- Open: remember `document.activeElement` (or the explicit opener) and restore focus on close.
- Panel: `fixed inset-x-0 top-0 z-50`, `height: 50vh` (≥ 640px) / `70vh` (< 640px), slide-down via `transform` transition 180 ms (none under reduced motion), backdrop click (a full-screen transparent button below the panel, `aria-label` close) closes. Content: `<TerminalWindow title={cwd} onClose={close} closeLabel={t.statusBar.closeShell} className="h-full">` whose body hosts a `div ref` for xterm.
- First open: show `LoadingBar` until `loadXterm()` resolves; on rejection show `ErrorLine` with `t.shell.loadFailed` and a `[ retry ]` button that calls `loadXterm()` again.
- Terminal options: `fontFamily: '"JetBrains Mono", monospace'`, `fontSize: 13`, `theme: xtermTheme()`, `cursorBlink: !reducedMotion`, `screenReaderMode: true`, `allowProposedApi: true` (required by unicode addon), `convertEol: false`. Load `FitAddon` (fit on open and on `ResizeObserver`), `WebLinksAddon` with a handler: same-origin `/...` URLs → `navigate(path)` + close; others → `window.open(url, '_blank', 'noopener')`; `UnicodeGraphemesAddon` and set `term.unicode.activeVersion` to its graphemes version. Use `term.options.linkHandler` for OSC-8 with the same handler.
- The `Terminal` instance is created once and kept while the provider lives (closing hides the panel, does not dispose); dispose on unmount.
- Welcome banner once per session (`sessionStorage['shell-welcomed']`): `bold(t.shell.welcome)` and `t.shell.hint`.
- Prompt: `color('guest@prommin','green',true) + ':' + color(cwd,'blue',true) + '$ '` (bold user/path).
- History: load from `localStorage['shell-history']` (JSON array of strings, last 100) on mount; save after each command (try/catch).
- `ctx.goSection` → `goToSection(id, navigate, location.pathname)` and **keeps the shell open**; `ctx.navigate` → router navigate; `ctx.openExternal` → `window.open(url,'_blank','noopener')`; `ctx.clear` → `term.clear()`; `ctx.close` → close panel; `ctx.setLang` → i18n `setLang`.
- If `SHELL_THAI=english`, `ctx.t = translations.en` and `ctx.lang = 'en'`.
- Navbar: add `[ >_ shell ]` button (desktop row and mobile overlay) calling `openShell(buttonEl)`; `aria-pressed={open}`; label `t.statusBar.openShell`/`closeShell`.
- Hero: under the status line, a dim line `t.shell.heroHint` on fine pointers and `t.shell.heroHintTouch` on `(pointer: coarse)`; the `` ` `` is rendered as `<kbd>`.

- [ ] **Step 1: Failing provider tests** (`ShellProvider.test.tsx`) — mock `./QuakeShell` to a stub rendering `data-testid="shell"` when open:

```tsx
vi.mock('./QuakeShell', () => ({ default: ({ open }: { open: boolean }) => (open ? <div data-testid="shell" /> : null) }));
import { render, screen, fireEvent } from '@testing-library/react';
import ShellProvider from './ShellProvider';
import { useShell } from './useShell';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function Opener() { const s = useShell(); return <button onClick={(e) => s.openShell(e.currentTarget)}>opener</button>; }
function renderP(extra?: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}><I18nProvider><MemoryRouter>
    <ShellProvider><Opener />{extra}</ShellProvider></MemoryRouter></I18nProvider></QueryClientProvider>);
}

it('backtick toggles the shell', () => {
  renderP();
  fireEvent.keyDown(window, { key: '`' });
  expect(screen.getByTestId('shell')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByTestId('shell')).toBeNull();
});
it('backtick inside an input types instead of opening', () => {
  renderP(<input aria-label="field" />);
  const input = screen.getByLabelText('field');
  input.focus();
  fireEvent.keyDown(input, { key: '`' });
  expect(screen.queryByTestId('shell')).toBeNull();
});
it('ignores backtick with Alt/Meta', () => {
  renderP(); fireEvent.keyDown(window, { key: '`', altKey: true });
  expect(screen.queryByTestId('shell')).toBeNull();
});
it('returns focus to the opener on close', () => {
  renderP();
  const btn = screen.getByText('opener');
  fireEvent.click(btn);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(document.activeElement).toBe(btn);
});
```

- [ ] **Step 2: Failing QuakeShell tests** (`QuakeShell.test.tsx`) — mock `./loadXterm` to return fake `Terminal` (records `write`, exposes `onData(cb)` to push input, `cols = 80`, `unicode`, `options`, `loadAddon`, `open`, `focus`, `clear`, `dispose`) and fake addons; mock `@/lib/api`:

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@/i18n/I18nContext';
import * as spy from '@/hooks/useActiveSection';
import QuakeShell from './QuakeShell';

const fake = vi.hoisted(() => ({ writes: [] as string[], input: null as null | ((d: string) => void), fail: 0 }));
vi.mock('./loadXterm', () => ({
  loadXterm: async () => {
    if (fake.fail > 0) { fake.fail--; throw new Error('chunk'); }
    class Terminal {
      cols = 80; options: Record<string, unknown> = {}; unicode = { activeVersion: '' };
      write(d: string) { fake.writes.push(d); } onData(cb: (d: string) => void) { fake.input = cb; return { dispose() {} }; }
      loadAddon() {} open() {} focus() {} clear() {} dispose() {}
    }
    class Addon { fit() {} dispose() {} }
    return { Terminal, FitAddon: Addon, WebLinksAddon: Addon, UnicodeGraphemesAddon: Addon };
  },
}));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: {
    projects: async () => ({ items: [{ slug: 'kanban', name: { en: 'Kanban', th: '' }, description: { en: 'd', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: true }] }),
    posts: async () => ({ items: [{ slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, tags: [], coverUrl: '', publishedAt: '2026-10-09T00:00:00.000Z' }], page: 1, perPage: 50, total: 1 }),
    post: async () => ({ slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, body: { en: '', th: '' }, tags: [], coverUrl: '', publishedAt: '2026-10-09T00:00:00.000Z' }),
  },
}));

function Loc() { const l = useLocation(); return <div data-testid="loc">{l.pathname}</div>; }
const out = () => fake.writes.join('');
function ui(onClose = vi.fn()) {
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider><MemoryRouter initialEntries={['/']}>
    <Routes><Route path="*" element={<><QuakeShell open onClose={onClose} /><Loc /></>} /></Routes>
  </MemoryRouter></I18nProvider></QueryClientProvider>);
  return onClose;
}
beforeEach(() => { fake.writes = []; fake.input = null; fake.fail = 0; sessionStorage.clear(); });

it('shows the welcome banner and runs ls', async () => {
  ui();
  await waitFor(() => expect(out()).toContain("Welcome to prommin's shell."));
  fake.input!('ls\r');
  await waitFor(() => expect(out()).toContain('projects/'));
});
it('shows a retry line when xterm fails to load', async () => {
  fake.fail = 1; ui();
  expect(await screen.findByRole('alert')).toHaveTextContent('failed to load the terminal');
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  await waitFor(() => expect(fake.input).not.toBeNull());
});
it('cd skills keeps the shell open and scrolls', async () => {
  const go = vi.spyOn(spy, 'goToSection').mockImplementation(() => {});
  const onClose = ui();
  await waitFor(() => expect(fake.input).not.toBeNull());
  fake.input!('cd skills\r');
  await waitFor(() => expect(go).toHaveBeenCalledWith('skills', expect.any(Function), '/'));
  expect(onClose).not.toHaveBeenCalled();
});
it('open post navigates and closes', async () => {
  const onClose = ui();
  await waitFor(() => expect(fake.input).not.toBeNull());
  fake.input!('open hello\r');
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/blog/hello'));
  expect(onClose).toHaveBeenCalled();
});
```
(`spy.goToSection` is spied through the module namespace, so `useShellContext` must call it as `goToSection(...)` imported from `@/hooks/useActiveSection`; if ESM spying fails, inject `goToSection` via a module-level indirection object instead.)

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: Implement** `useShellContext.ts`, `ShellProvider.tsx`, `QuakeShell.tsx`, the `TerminalWindow` `onClose` addition (+ one test: with `onClose` the close control is a button with the label and calls it), Navbar button, Hero hint, and wire `Layout.tsx`:

```tsx
// Layout.tsx (relevant part)
export default function Layout() {
  // …existing fx state…
  return (
    <ShellProvider>
      <LayoutInner /* existing JSX moved here */ />
    </ShellProvider>
  );
}
function LayoutInner() {
  const shell = useShell();
  // …existing markup…
  // <StatusBar shellOpen={shell.open} onToggleShell={shell.toggle} />
}
```
`ShellProvider` renders `<Suspense fallback={null}><QuakeShell open={open} onClose={close} /></Suspense>` with `const QuakeShell = lazy(() => import('./QuakeShell'))` so the panel code and xterm stay out of the entry chunk; it mounts `QuakeShell` only after the first open.

- [ ] **Step 5: Run** `npx vitest run src/shell src/components` → PASS; `npm run lint && npm test -- --run && npm run build`. Check the entry chunk: compare `dist/assets/index-*.js` gzip size with the size recorded before Task 2 (`gzip -c file | wc -c`); growth ≤ 15 kB; `grep -l "xterm" dist/assets/index-*.js` → none.

- [ ] **Step 6: Visual check** — dev server proxied to :8095 as in Task 2; screenshots `screens/t-shell-6-*.png`: shell open at 1440 after `help`, after `ls projects`, after `cat ~/projects/kanban`, with TH language (if `SHELL_THAI=ok`), and at 390 width. View them; the prompt, colours and Thai text must render cleanly and the status bar must stay visible below the panel.

- [ ] **Step 7: Commit**

```bash
git add app/src/shell app/src/components/Layout.tsx app/src/components/Navbar.tsx app/src/components/term app/src/sections/HeroSection.tsx app/src/i18n/translations.ts
git commit -m "feat(shell): Quake drop-down xterm shell with shortcuts and entry points"
```

---

### Task 7: Boot sequence

**Files:**
- Create: `app/src/boot/BootSequence.tsx`, `app/src/boot/shouldBoot.ts`, `app/src/boot/BootSequence.test.tsx`
- Modify: `app/src/components/Layout.tsx` (mount), `app/src/i18n/translations.ts` (`boot` keys)

**Interfaces:**
- Produces: `<BootSequence />` (default export of `BootSequence.tsx`) and `export function shouldBoot(pathname: string): boolean` in `app/src/boot/shouldBoot.ts` — true only if `pathname === '/'`, `sessionStorage['booted']` unset (read in try/catch; storage error → false), `matchMedia('(prefers-reduced-motion: reduce)')` false, and `navigator.webdriver` falsy.

Translations (en / th):
```ts
boot: {
  mounted: 'Mounted /home/prommin',             // th: 'เมานต์ /home/prommin แล้ว'
  started: 'Started portfolio.service',         // th: 'เริ่ม portfolio.service แล้ว'
  reached: 'Reached target Graphical Interface',// th: 'เข้าสู่ Graphical Interface แล้ว'
  login: 'prommin login: guest (automatic login)', // th: 'prommin login: guest (เข้าสู่ระบบอัตโนมัติ)'
  skip: 'press any key to skip',                // th: 'กดปุ่มใดก็ได้เพื่อข้าม'
},
```

Behaviour: on mount, if `shouldBoot` → set `sessionStorage['booted']='1'`, render a `fixed inset-0 z-[60] bg-bg font-mono text-sm p-6` overlay with `aria-hidden="true"`, reveal one line every 250 ms (`[  OK  ]` with `OK` in `text-ansi-bright-green`; the login line plain), after the last line wait 200 ms then fade out over 300 ms (`opacity` transition) and unmount. Total ≈ 1.2–1.5 s. Any `keydown`, `pointerdown` or `touchstart` on window → unmount immediately. All timers cleared on unmount. It never steals focus.

- [ ] **Step 1: Failing tests** (`BootSequence.test.tsx`) with `vi.useFakeTimers()`:

```tsx
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import BootSequence from './BootSequence';
import { shouldBoot } from './shouldBoot';

const mm = (reduce: boolean) => vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, onchange: null, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList);
const ui = (path = '/') => render(<I18nProvider><MemoryRouter initialEntries={[path]}><BootSequence /></MemoryRouter></I18nProvider>);
beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); mm(false); Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true }); });
afterEach(() => vi.useRealTimers());

it('shows once per session then disappears', () => {
  ui();
  expect(screen.getByTestId('boot')).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.queryByTestId('boot')).toBeNull();
  expect(shouldBoot('/')).toBe(false);
});
it('reveals lines progressively', () => {
  ui();
  expect(screen.queryByText(/Reached target/)).toBeNull();
  act(() => { vi.advanceTimersByTime(800); });
  expect(screen.getByText(/Reached target/)).toBeInTheDocument();
});
it('skips on any key', () => {
  ui(); fireEvent.keyDown(window, { key: 'a' });
  expect(screen.queryByTestId('boot')).toBeNull();
});
it('does not show on deep links', () => { ui('/blog/x'); expect(screen.queryByTestId('boot')).toBeNull(); });
it('does not show under reduced motion', () => { mm(true); ui(); expect(screen.queryByTestId('boot')).toBeNull(); });
it('does not show to automation', () => {
  Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });
  ui(); expect(screen.queryByTestId('boot')).toBeNull();
});
it('survives storage errors', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(shouldBoot('/')).toBe(false);
});
it('is hidden from assistive tech and does not take focus', () => {
  const before = document.activeElement; ui();
  expect(screen.getByTestId('boot')).toHaveAttribute('aria-hidden', 'true');
  expect(document.activeElement).toBe(before);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `BootSequence.tsx` (decide `shouldBoot` once in a `useState` initializer using `useLocation().pathname`; set the session flag in an effect when showing).

- [ ] **Step 4: Mount** `<BootSequence />` as the last child inside `Layout`'s root div. Check that `Layout.test.tsx` still passes (jsdom has no `navigator.webdriver` by default → set it to `true` in `src/test/setup.ts` so other tests never see the overlay; BootSequence tests override it).

- [ ] **Step 5: Run** `npm run lint && npm test -- --run && npm run build` → pass. Visual: screenshot mid-boot (fresh session, 600 ms after load) at 1440 to `screens/t-shell-7-boot.png` using a Playwright context where `navigator.webdriver` is overridden to `false` via `addInitScript`.

- [ ] **Step 6: Commit**

```bash
git add app/src/boot app/src/components/Layout.tsx app/src/i18n/translations.ts app/src/test/setup.ts
git commit -m "feat(app): first-visit boot sequence"
```

---

### Task 8: E2E and docs

**Files:**
- Create: `e2e/shell.spec.ts`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: the running app via the existing Playwright config (port 8090, seeded projects, `navigator.webdriver` true → no boot overlay).

- [ ] **Step 1: Write the E2E test**

```ts
import { expect, test } from '@playwright/test';

test('shell: list projects and jump to skills', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Backquote');
  const shell = page.locator('.xterm');
  await expect(shell).toBeVisible();
  await page.keyboard.type('ls projects');
  await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-rows')).toContainText('kanban');
  await page.keyboard.type('cd skills');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Window list' }).getByRole('button', { name: /3:skills\*/ })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.getElementById('skills')!.getBoundingClientRect().top)).toBeLessThan(200);
  await page.keyboard.press('Escape');
  await expect(shell).toBeHidden();
});

test('shell button in the status bar opens the shell', async ({ page }) => {
  await page.goto('/blog');
  await page.getByRole('navigation', { name: 'Window list' }).getByRole('button', { name: /open shell/i }).click();
  await expect(page.locator('.xterm')).toBeVisible();
});
```
If xterm's DOM renderer does not expose text in `.xterm-rows`, use `.xterm-accessibility-tree` (present because `screenReaderMode: true`).

- [ ] **Step 2: Run** `cd e2e && npm test` → all specs pass (existing 4 + 2 new).

- [ ] **Step 3: Update `AGENTS.md`** — add a "Shell, status bar, boot" section: file map from this plan, the command list, the `ShellContext` boundary (commands never import xterm; only `readline.ts` writes to a `TermPort`), lazy-loading rule, React Query keys shared with the page, `SHELL_THAI` decision and what it means, `useActiveSection` shared by Navbar/StatusBar, boot gating (session flag, reduced motion, `navigator.webdriver`, `/` only), and that `src/test/setup.ts` sets `navigator.webdriver = true`.

- [ ] **Step 4: Final verification** — `cd app && npm run lint && npm test -- --run && npm run build`; `cd e2e && npm test`; paste trimmed outputs into the task report.

- [ ] **Step 5: Commit**

```bash
git add e2e/shell.spec.ts AGENTS.md
git commit -m "test(e2e): shell flow; docs: shell, status bar and boot"
```
