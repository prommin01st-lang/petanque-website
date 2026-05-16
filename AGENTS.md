# AGENTS.md — PixelArt 3D Portfolio

> This file is written for AI coding agents. It assumes no prior knowledge of the project.

---

## Project Overview

This repository contains a **pixel-art themed 3D portfolio website**. It is implemented as two independent front-end applications located in the `app/` and `app-pixel-art/` directories. Both are single-page React applications built with Vite, TypeScript, and Tailwind CSS.

* **`app/`** — The **primary, full-featured application**. It includes 3D CSS transforms, scroll-driven animations, a shadcn/ui component library, and a rich pixel-art design system. This is the version that is actively developed.
* **`app-pixel-art/`** — An earlier, simpler variant with the same visual theme but fewer dependencies, no routing, and no shadcn/ui components. It appears to be a baseline or backup version.

The site is a static presentation portfolio (no backend). It showcases projects, skills, stats, and a contact form (demo-only — no server endpoint).

---

## Technology Stack

### `app/` (Primary)

| Layer | Technology | Version (from `package.json`) |
|---|---|---|
| Framework | React | ^19.2.0 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | ^7.2.4 |
| Styling | Tailwind CSS | ^3.4.19 |
| UI Library | shadcn/ui (Radix-based) | — |
| Animation | framer-motion, gsap, @gsap/react | latest |
| Routing | react-router-dom (HashRouter) | ^7.15.0 |
| Icons | lucide-react | ^0.562.0 |
| Toast | sonner | ^2.0.7 |
| Linting | ESLint + typescript-eslint + react-hooks/refresh plugins | ^9.39.1 |

### `app-pixel-art/` (Baseline)

| Layer | Technology | Version (from `package.json`) |
|---|---|---|
| Framework | React | ^18.2.0 |
| Language | TypeScript | ^5.2.2 |
| Build Tool | Vite | ^5.1.4 |
| Styling | Tailwind CSS | ^3.4.1 |
| Icons | lucide-react | ^0.344.0 |

Both projects use **PostCSS** with `tailwindcss` and `autoprefixer`.

---

## Build & Development Commands

Run these from inside the respective application directory (`app/` or `app-pixel-art/`).

```bash
# Install dependencies
npm install

# Start local dev server (Vite HMR)
npm run dev

# Production build (TypeScript compile + Vite bundle)
npm run build

# Preview production build locally
npm run preview
```

**Additional commands in `app/` only:**

```bash
# Run ESLint
npm run lint
```

**Important notes:**
* The `app/` dev server is configured to run on **port 3000** (`vite.config.ts`).
* `app/vite.config.ts` sets `base: './'` so the built assets use relative paths (suitable for static hosting).
* Both projects output the production bundle to `dist/`.

---

## Code Organization

### `app/` Directory Structure

```
app/
├── public/                 # Static assets (PNG project images, profile picture)
├── src/
│   ├── components/
│   │   ├── ui/             # shadcn/ui components (40+ Radix primitives)
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   │   └── Navbar.tsx
│   ├── hooks/
│   │   ├── use-mobile.ts   # Responsive breakpoint detection
│   │   └── usePixelit.ts   # Canvas-based hover pixelation effect
│   ├── lib/
│   │   └── utils.ts        # `cn()` helper (clsx + tailwind-merge)
│   ├── pages/
│   │   └── Home.tsx        # Placeholder page (currently unused; routing is inline in App.tsx)
│   ├── sections/
│   │   ├── AboutSection.tsx
│   │   ├── ContactSection.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ProjectsSection.tsx
│   │   ├── SkillsSection.tsx
│   │   └── StatsSection.tsx
│   ├── App.css             # Additional component-specific styles
│   ├── App.tsx             # Root component with HashRouter
│   ├── index.css           # Global styles, Tailwind directives, CSS variables, keyframes
│   └── main.tsx            # Entry point (createRoot)
├── components.json         # shadcn/ui configuration (style: new-york, rsc: false)
├── eslint.config.js        # ESLint flat config (TypeScript + React)
├── index.html              # HTML entry point (loads Google Fonts)
├── postcss.config.js       # PostCSS pipeline
├── tailwind.config.js      # Extended theme (pixel-art palette, fonts, animations)
├── tsconfig.json           # Project references (app + node)
├── tsconfig.app.json       # App TS config (strict, bundler resolution)
└── tsconfig.node.json      # Vite config TS config
```

### `app-pixel-art/` Directory Structure

```
app-pixel-art/
├── src/
│   ├── components/
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   │   └── Navbar.tsx
│   ├── sections/
│   │   ├── AboutSection.tsx
│   │   ├── ContactSection.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ProjectsSection.tsx
│   │   ├── SkillsSection.tsx
│   │   └── StatsSection.tsx
│   ├── App.tsx
│   ├── index.css           # Global pixel-art styles
│   ├── main.tsx            # Entry point with React.StrictMode
│   └── vite-env.d.ts
├── index.html
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── tsconfig.node.json
```

---

## Key Configuration Files

| File | Purpose |
|---|---|
| `app/package.json` | Dependencies and scripts for the primary app. |
| `app-pixel-art/package.json` | Dependencies and scripts for the baseline app. |
| `app/vite.config.ts` | Vite config: React plugin, path alias `@/`, base path `./`, port 3000. |
| `app/tailwind.config.js` | Extensive custom theme: pixel-art color palette, font families (`pixel`, `label`, `body`, `code`, `thai`), spacing, box-shadows, keyframes/animations. |
| `app/tsconfig.app.json` | Strict TypeScript settings: `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. |
| `app/eslint.config.js` | Flat ESLint config: recommended JS + TS + React Hooks + React Refresh. Ignores `dist`. |
| `app/components.json` | shadcn/ui registry config (aliases: `@/components`, `@/lib/utils`, `@/hooks`). |
| `app-pixel-art/vite.config.ts` | Minimal Vite config (React plugin only). |
| `app-pixel-art/tailwind.config.js` | Smaller custom theme (subset of the pixel-art palette). |

---

## Code Style & Conventions

* **Language:** All source code and comments are in **English**.
* **TypeScript strict mode** is enabled in both projects. `noUnusedLocals` and `noUnusedParameters` are turned on — unused variables will fail the build.
* **Path alias:** `@/*` maps to `src/*` in both projects. shadcn/ui components import utilities via `@/lib/utils`.
* **Imports:** The primary app uses `verbatimModuleSyntax` (from TS 5.0+). Always use `import type { ... }` for type-only imports.
* **Component style:** Most React components are **default exports** (e.g., `export default function HeroSection()`). Internal helper components are often defined as named functions in the same file.
* **Styling approach:**
  * Tailwind utility classes are used extensively.
  * Custom CSS variables for the pixel-art palette are defined in `src/index.css` (both apps).
  * Inline `style` props are used frequently for dynamic 3D transforms, exact colors, and animation values.
  * Custom `.btn-pixel`, `.card-pixel`, `.input-pixel`, etc. utility classes are defined in `index.css`.
* **shadcn/ui components** follow the standard pattern: `cva` (class-variance-authority) for variants, `cn()` for conditional class merging, `Slot` from Radix for `asChild` support.
* **Comments:** Section dividers in source files use block comments like `/* ------------------------------------------------------------------ */` to separate data, constants, and sub-components.
* **State management:** No global state library (Redux/Zustand). Only local `useState` / `useRef`. The contact form uses uncontrolled inputs with native `onSubmit`.
* **Accessibility:** `aria-label` attributes are present on icon buttons. `prefers-reduced-motion` is respected via CSS media query and Framer Motion's `useReducedMotion` where applicable.

---

## Testing

* **No testing framework is currently configured.**
* There are no test files (`.test.ts`, `.spec.tsx`, etc.) in the repository.
* The `package.json` scripts do not include a `test` command.
* If you add tests, prefer a Vite-native solution such as **Vitest** + **React Testing Library** to stay consistent with the build tooling.

---

## Deployment

* Both apps are **static sites** suitable for any static host (Vercel, Netlify, GitHub Pages, etc.).
* The `petanque-portfolio-vercel.zip` file in the repository root suggests the site may be packaged for Vercel deployment, but no CI/CD configuration file (e.g., `.github/workflows`, `vercel.json`) is present.
* The primary app sets `base: './'` in `vite.config.ts`, which ensures asset paths are relative and work regardless of the deploy subdirectory.

---

## Security Considerations

* **No backend or API server** — this is a purely client-side rendered portfolio.
* **Contact form is a demo.** Submitting the form shows a toast (`sonner`) saying *"Message sent! (Demo only)"* and does not transmit data anywhere.
* **No secrets or API keys** are hard-coded in the source.
* The `usePixelit` hook creates a `<canvas>` overlay dynamically; it does not execute external scripts.
* Google Fonts are loaded via standard `<link>` tags in `index.html`.

---

## Useful Context for Agents

* When modifying shadcn/ui components, follow the existing `cva` + `cn()` pattern. Do not introduce inline styles inside reusable UI primitives unless necessary.
* The Tailwind config defines many custom animations (`animate-twinkle`, `animate-float-drift`, `animate-heartbeat`, etc.). Prefer these over one-off inline animations when possible.
* The primary app uses `HashRouter` from `react-router-dom`. All navigation is done via anchor links (`#about`, `#projects`, etc.) with smooth scrolling. There is only one route (`/`).
* The `app/src/pages/Home.tsx` file exists but is **not imported** by `App.tsx`. The root component defines `HomePage` inline. If you add new pages, wire them into `App.tsx`.
* Both apps share the same visual theme. If you change colors, update the CSS variables in `src/index.css` **and** the `tailwind.config.js` theme extensions to keep them in sync.
* The `dist/` folder in `app/` is a committed build output. Be careful not to overwrite it unintentionally.
