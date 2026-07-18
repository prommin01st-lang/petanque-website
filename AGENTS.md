# AGENTS.md — Interactive Developer Sandbox 3D Portfolio

> This file is written for AI coding agents. It assumes no prior knowledge of the project.

---

## Project Overview

This repository contains an **"Interactive Developer Sandbox" 3D portfolio website** for a full-stack developer ("Prommin L."). It is a single-page React application located in the `app/` directory, built with Vite, TypeScript, Tailwind CSS, and **Three.js (React Three Fiber)**.

The whole site floats above a **full-viewport interactive 3D sandbox**: a fixed WebGL canvas sits behind all sections, filled with draggable/throwable 3D "tech stack" blocks, a neon grid floor, particles, and a scroll-reactive camera. The UI theme is **Terminal/HUD**: JetBrains Mono, glass panels (`backdrop-blur`), terminal-window cards, and neon cyan/green/purple accents on black. UI copy is **bilingual (English/Thai)** via a custom i18n context.

The site is a static presentation portfolio (no backend). It showcases projects, skills, focus areas, and a contact form (demo-only — no server endpoint).

**Content source of truth:** portfolio copy is aligned with https://prommin01st-lang.github.io/ (about, resume, and 10 project pages).

**Repository root contents:**

| File / Directory | Purpose |
|---|---|
| `app/` | The entire application (the only app in the repo). |
| `plan.md` | One-line-per-stage project plan. |
| `tech-spec.md` | Technical design document. |
| `screenshot.png` | A screenshot of the site. |
| `AGENTS.md` | This file. |

> **Note:** The repository previously contained a second app, `app-pixel-art/`. Its files have been **deleted from the working tree** (the deletion is visible in `git status` but not yet committed). Do not resurrect it unless explicitly asked.

---

## Technology Stack (`app/`)

| Layer | Technology | Version (from `package.json`) |
|---|---|---|
| Framework | React | ^19.2.0 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | ^7.2.4 |
| 3D / WebGL | three, @react-three/fiber, @react-three/drei | ^0.185.1 / ^9.6.1 / ^10.7.7 |
| Styling | Tailwind CSS | ^3.4.19 |
| UI Library | shadcn/ui (Radix-based, style: new-york) | — |
| Animation | framer-motion | ^12.38.0 |
| Animation (installed, **unused**) | gsap, @gsap/react | ^3.15.0 / ^2.1.2 |
| Routing | react-router-dom (HashRouter) | ^7.15.0 |
| Icons | lucide-react | ^0.562.0 |
| Toast | sonner | ^2.0.7 |
| Linting | ESLint 9 + typescript-eslint + react-hooks/react-refresh plugins | ^9.39.1 |
| Dev tooling | plugin-inspect-react-code (Vite plugin) | ^1.0.3 |

PostCSS runs `tailwindcss` + `autoprefixer` (`app/postcss.config.js`).

---

## Build & Development Commands

Run all commands from inside `app/`:

```bash
npm install        # Install dependencies
npm run dev        # Vite dev server with HMR — http://localhost:3000
npm run build      # Production build: tsc -b && vite build → outputs to app/dist/
npm run preview    # Preview the production build locally
npm run lint       # Run ESLint (flat config, ignores dist/)
```

**Important notes:**

* The dev server is pinned to **port 3000** (`vite.config.ts`).
* `vite.config.ts` sets `base: './'` so built assets use relative paths (works in any deploy subdirectory).
* The build runs `tsc -b` first — **type errors fail the build**. `npm run build` passes.
* `npm run lint` currently reports **9 pre-existing errors**, all in untouched generated/shared files: 8× `react-refresh/only-export-components` (in `src/components/ui/*` and `src/i18n/I18nContext.tsx`) and 1× `react-hooks/purity` (`src/components/ui/sidebar.tsx:611`, a `Math.random()` inside the shadcn sidebar skeleton). All first-party code is lint-clean.
* `app/dist/` is **gitignored** — a local build artifact, not committed.
* The JS bundle is ~1.4 MB because of three.js; the sandbox is code-split via `React.lazy` in `Layout.tsx`, so the initial chunk stays small.

---

## Code Organization

```
app/
├── public/                    # Static PNG assets (profile.png; legacy project screenshots, mostly unused)
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (53 files, Radix primitives)
│   │   ├── Layout.tsx         # Page shell: lazy <SandboxCanvas/> + Navbar + <main> + Footer + sonner <Toaster/>
│   │   ├── Navbar.tsx         # Fixed nav: prompt logo ~/prommin-l $, //links, scroll-spy, EN/TH toggle
│   │   └── Footer.tsx         # Mono footer: prompt, social links, tech credit
│   ├── hooks/
│   │   └── use-mobile.ts      # Responsive breakpoint detection (shadcn)
│   ├── i18n/
│   │   ├── I18nContext.tsx    # I18nProvider + useI18n() hook (lang, t, setLang, toggleLang)
│   │   └── translations.ts    # All UI strings, `en` and `th` objects (`as const`)
│   ├── lib/
│   │   └── utils.ts           # cn() helper (clsx + tailwind-merge)
│   ├── sandbox/               # ★ Three.js 3D sandbox (React Three Fiber)
│   │   ├── SandboxCanvas.tsx  # Fixed full-viewport <Canvas>: lights, fog, tooltip, reduced-motion/WebGL gating
│   │   └── scene/
│   │       ├── CameraRig.tsx  # Pointer parallax + scroll-driven camera dolly (damped lerp in useFrame)
│   │       ├── GridFloor.tsx  # drei <Grid> infinite neon floor at y=0
│   │       ├── TechBlocks.tsx # ★ 22 draggable/throwable tech blocks w/ custom lightweight physics
│   │       ├── CoreObject.tsx # 3D React Atom Logo floating in the hero zone
│   │       └── Particles.tsx  # drei <Stars> starfield backdrop
│   ├── sections/              # One component per page section, composed in App.tsx
│   │   ├── HeroSection.tsx    # Prompt greeting, glowing name, CTAs, stats; profile in .term-window card
│   │   ├── AboutSection.tsx   # Bio + quick_facts.yaml terminal card
│   │   ├── ProjectsSection.tsx# 10 terminal-window project cards (carousel + mobile stack, repo links, metrics)
│   │   ├── SkillsSection.tsx  # 5 categories as .panel-hud + .chip lists
│   │   ├── StatsSection.tsx   # 3 focus-area .panel-hud cards with mouse tilt
│   │   └── ContactSection.tsx # Terminal-styled form ($ send-message) + direct links
│   ├── App.tsx                # Root: HashRouter with a single route; defines HomePage inline
│   ├── index.css              # Tailwind directives, shadcn vars, sandbox palette vars, HUD component classes
│   └── main.tsx               # Entry point: wraps <App /> in <I18nProvider>
├── components.json            # shadcn/ui config (style: new-york, rsc: false, iconLibrary: lucide)
├── eslint.config.js           # ESLint flat config (JS + TS + react-hooks + react-refresh)
├── index.html                 # HTML entry: Google Fonts (Inter + JetBrains Mono) + /src/main.tsx
├── info.md                    # Template setup notes
├── postcss.config.js          # tailwindcss + autoprefixer
├── tailwind.config.js         # Sandbox theme: colors, mono fonts, glow shadows, keyframes
├── tsconfig.json              # Project references (app + node)
├── tsconfig.app.json          # App TS config (strict, bundler resolution)
└── tsconfig.node.json         # Vite config TS config
```

---

## The 3D Sandbox (`src/sandbox/`) — How It Works

* **`SandboxCanvas.tsx`** — mounts a fixed `inset-0 z-0` `<Canvas>` behind all content. Gated at mount: skipped entirely when `prefers-reduced-motion` is set or WebGL is unavailable (the CSS gradient on `body` is the fallback backdrop). `frameloop` pauses on tab hide (`visibilitychange`). Mobile (width < 768 or coarse pointer): half the blocks, DPR capped at 1.5 (desktop 1.75). Hover tooltip is a plain DOM div (no troika/drei `Text`, avoiding CDN font fetches).
* **`TechBlocks.tsx`** — the interactive core. ~22 primitives (box/sphere/cylinder/torus/octahedron/icosahedron/tetrahedron) in brand colors, each bound to a tech name. Interactions via R3F pointer events + raycasting: hover → emissive glow + tooltip + `grab` cursor; **drag on a screen-parallel plane → throw on release** (velocity from pointer delta, capped). Custom lightweight physics in `useFrame` (gravity, floor bounce, walls, angular damping, settle → drift home → idle bob). No physics library.
* **Physics state** lives in a `useRef` array (re)built inside `useEffect` — `react-hooks/refs` and `react-hooks/immutability` forbid ref writes during render and mutation of hook-returned values. Render-time randomness uses `hashRand(seed)` (deterministic `Math.sin` hash) because `react-hooks/purity` forbids `Math.random()` during render. Follow this pattern when adding scene objects.
* **`CameraRig.tsx`** — reads `window.scrollY` progress and pointer position (window listeners) and damp-lerps the camera each frame: slight dolly-in + descend as you scroll, parallax on pointer move.
* **Pointer-event contract:** section wrappers use `pointer-events-none` and inner content panels/cards use `pointer-events-auto`, so empty page areas pass clicks/drags through to the canvas (blocks can be grabbed anywhere). Keep this contract when adding sections. The canvas wrapper sets `touch-action: pan-y` so mobile vertical scrolling still works.

---

## Theme: Terminal/HUD Design System

* **Palette** (`tailwind.config.js` + matching CSS vars in `src/index.css`): `bg #05080D`, `surface #0B1118`, `text #D7E3F0`, `text-dim #6B7A90`, `neon-cyan #00E5FF`, `terminal-green #4AF626`, `hud-purple #6C5CE7`, `gold #FFD93D`, `hud-border #1E2A38`, terminal-dot colors `hud-red/hud-amber`. Keep `index.css` vars and `tailwind.config.js` colors in sync.
* **Fonts:** `font-mono` → JetBrains Mono (labels, headings, chips, buttons); `font-body` → Inter (paragraphs). Only these two are loaded in `index.html`. **Press Start 2P / VT323 were removed** with the old pixel-art theme.
* **Component classes** (`src/index.css`): `.panel-hud` (glass panel + cyan corner brackets), `.term-window` + `.term-window-header` + `.term-dot-*` (terminal cards), `.btn-neon` / `.btn-neon-outline`, `.chip` (+ `.chip-green`, `.chip-purple`), `.input-hud` / `.textarea-hud`, `.text-glow-cyan` / `.text-glow-purple`, `.link-neon`, `.nav-link-hud`. Prefer these over new one-off styles.
* **Tailwind shadows:** `shadow-glow-cyan`, `shadow-glow-cyan-sm`, `shadow-glow-purple`, `shadow-glow-green`. Animations kept: `animate-blink-cursor`, `animate-pulse-dot`, `animate-caret-blink` (+ shadcn accordion).
* The old pixel-art classes (`.btn-pixel`, `.card-pixel`, `.crt-overlay`, `.input-pixel`, …) and pixel keyframes were **deleted**. Don't reference them.

---

## Key Configuration Files

| File | Purpose |
|---|---|
| `app/package.json` | Dependencies and scripts (`dev`, `build`, `lint`, `preview`). `"type": "module"`. |
| `app/vite.config.ts` | React plugin, `inspectAttr()`, `@` → `./src` alias, `base: './'`, port 3000. |
| `app/tailwind.config.js` | `darkMode: ["class"]`; sandbox palette; mono/body fonts; glow shadows; keyframes; `tailwindcss-animate` plugin. |
| `app/tsconfig.app.json` | Strict TS: `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. |
| `app/eslint.config.js` | Flat config: `@eslint/js` recommended + `typescript-eslint` recommended + react-hooks (incl. compiler rules: purity/refs/immutability/set-state-in-effect) + react-refresh. |
| `app/components.json` | shadcn/ui registry config. Aliases: `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks`. |
| `app/index.html` | Google Fonts: **Inter, JetBrains Mono** only. No other runtime CDN scripts. |

---

## Internationalization (i18n)

* Implemented by a **custom context**, not a library: `src/i18n/I18nContext.tsx` exposes `useI18n()` → `{ lang, t, setLang, toggleLang }`.
* Languages: **`'en'`** (default) and **`'th'`** (`export type Language = 'en' | 'th'`).
* All user-facing strings live in `src/i18n/translations.ts` as two parallel objects under `translations.en` / `translations.th`, frozen with `as const`.
* The provider is mounted in `main.tsx` around `<App />`; `setLang` also updates `document.documentElement.lang`.
* The Navbar has an **EN | TH toggle** (desktop and mobile overlay).
* **When adding or changing UI copy, add keys to BOTH `en` and `th`** — components consume strings via `t.<section>.<key>`, never hard-code copy. (Project tags/metrics in `ProjectsSection.tsx` are intentionally language-neutral data, not translated.)

---

## Code Style & Conventions

* **Language:** All source code, comments, and docs are in **English**. Thai appears only as translation values in `translations.ts`.
* **TypeScript strict mode.** `noUnusedLocals` / `noUnusedParameters` are on — unused variables fail `npm run build`.
* **Path alias:** `@/*` → `src/*` (configured in both `vite.config.ts` and `tsconfig*.json`).
* **Imports:** `verbatimModuleSyntax` is enabled — always use `import type { ... }` for type-only imports.
* **Components:** default-exported functions; helper sub-components are named functions in the same file.
* **Styling:** Tailwind utilities + HUD classes from `index.css`; inline `style` props for exact colors/values when needed. Keep `index.css` vars and `tailwind.config.js` in sync.
* **shadcn/ui:** standard `cva` variants + `cn()` + Radix `Slot` pattern. Don't add inline styles to shared UI primitives.
* **Animation:** framer-motion for DOM content (`motion`, `AnimatePresence`, `whileInView`); R3F `useFrame` for 3D. **gsap is installed but not imported anywhere.**
* **State:** no global state library. Local `useState`/`useRef` only, plus the i18n context. The contact form uses **uncontrolled inputs via refs** and shows a `sonner` toast on submit.
* **Comments:** section dividers use long `/* ----- */` block comments; files mix data constants at top with components below.
* **Accessibility:** `aria-label` on icon buttons; `prefers-reduced-motion` honored in CSS **and** the 3D canvas unmounts entirely; canvas wrapper is `aria-hidden`.

---

## Testing

* **No testing framework is configured.** There are no test files and no `test` script in `package.json`.
* Verification today = `npm run build` (type-check + bundle) and `npm run lint`.
* If you add tests, use a Vite-native setup (**Vitest** + **React Testing Library**) to match the tooling.

---

## Deployment

* Pure static site — deploy `app/dist/` to any static host (Vercel, Netlify, GitHub Pages, ...).
* `base: './'` means assets resolve relatively, so subdirectory deploys work.
* **No CI/CD configuration exists** (no `.github/workflows`, no `vercel.json`).

---

## Security Considerations

* **No backend or API** — fully client-side.
* **Contact form is a demo.** Submitting calls `toast.success(t.contact.form.success)` ("Message sent! (Demo only)"); nothing is transmitted.
* **No secrets or API keys** in source.
* Third-party runtime loads in `index.html`: Google Fonts only. Everything else (including three.js) is bundled.

---

## Known Quirks & Useful Context for Agents

* **Content is aligned with https://prommin01st-lang.github.io/** (retrieved 2026-07). 10 projects: kanban (flagship), domain-viewer, queue-backend, realtime-chat, contextgate, context-nexus, mcp-control-tower, automation-scripts, iron-coach-th, sarabun-ocr. Project cards link to real GitHub repos where the source site lists them (some projects have no public repo → no link).
* **Routing:** `HashRouter` with a single `/` route. In-page navigation is plain anchors (`#about`, `#projects`, `#skills`, `#contact`) with `scrollIntoView({ behavior: 'smooth' })`; scroll-spy in `Navbar.tsx` highlights the active section.
* **`gsap` / `@gsap/react` are installed but unused** — don't assume GSAP patterns exist; follow framer-motion / R3F styles instead.
* **Legacy project screenshots** in `public/` (kanban.png, etc.) are mostly unused — project cards are terminal windows without images. `profile.png` IS used (hero).
* **Deleted with the re-theme:** `src/hooks/usePixelit.ts`, `src/pages/Home.tsx`, `src/App.css`, the pixelit CDN script, Press Start 2P/VT323 fonts, and all pixel-art CSS. The sonner `<Toaster />` is now mounted in `Layout.tsx` (previously never mounted).
* **Lint:** see the note in Build & Development Commands — 9 pre-existing errors in generated/shared files; keep first-party code clean and don't expand the `ui/` folder surface unless asked.
* **Repo state:** `app-pixel-art/` shows as deleted (` D`) in `git status` — an uncommitted deletion. `app/dist/` exists locally but is gitignored.
* The working directory is on **Windows**; use Git-Bash-compatible commands.
