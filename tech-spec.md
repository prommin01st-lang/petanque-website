# Tech Spec — PixelArt 3D Portfolio

## Dependencies

### Core
- React 19 + TypeScript + Vite + Tailwind CSS v3.4.19 (from template)

### Animation
- **framer-motion** — Entrance animations, scroll-triggered reveals, stagger effects, hover animations. Used for: hero letter pop-in, section entrance, card hover lifts, stat counter animations.
- **gsap** + **@gsap/react** — Complex scroll-driven animations, timeline sequences. Used for: isometric scroll tilt, floating block drift coordination, project carousel 3D positioning.

### 3D & Interaction
- **@react-bits/pixelate** (or vanilla pixelit via CDN) — Pixel art image conversion on hover. Since pixelit is a vanilla JS library, we'll load it via script tag in index.html and access through window.pixelit, OR create a custom React hook that implements block-size pixelation using Canvas API.
- **react-bits** — Optional pixel-style UI primitives. Evaluate during implementation.

### Fonts
- Google Fonts loaded via `<link>` in index.html: 'Press Start 2P', 'VT323', 'Kanit', 'Inter', 'JetBrains Mono'

### Dev Dependencies
- No additional dev dependencies required beyond template defaults.

## Component Inventory

### Layout (shared)
| Component | Source | Notes |
|---|---|---|
| Navbar | Custom | Fixed top bar with pixel-block hover indicators, mobile hamburger overlay |
| Footer | Custom | Pixel decoration, social links, heartbeat animation |
| Layout | Custom | Wraps all sections, provides smooth scroll context |

### Sections
| Component | Notes |
|---|---|
| HeroSection | 3D stage: starfield, grid floor, floating blocks, profile with pixelit, 3D text |
| AboutSection | Two-column: bio text + Quick Facts card |
| ProjectsSection | 3D carousel with perspective, 6 project cards |
| SkillsSection | Isometric 3D grid of skill blocks with extrusion |
| StatsSection | 4 large stat blocks with mouse-follow 3D tilt |
| ContactSection | Contact form with 3D button press effect |

### Reusable Components
| Component | Source | Used By |
|---|---|---|
| PixelButton | Custom | Hero CTAs, Contact submit — 3D press effect |
| SectionTitle | Custom | All sections — "// PREFIX" + title pattern |
| ProjectCard | Custom | Projects carousel |
| SkillBlock | Custom | Skills isometric grid — 3D cube appearance |
| StatBlock | Custom | Stats section — mouse-follow tilt |
| FloatingBlock | Custom | Hero background — drifting pixel blocks |
| PixelCorners | Custom | Hero profile — decorative corner brackets |

### Hooks
| Hook | Purpose |
|---|---|
| usePixelit | Initialize pixelit on an image, handle hover pixelation/reset |
| useMouseTilt | Mouse-follow 3D tilt effect for stat blocks |
| useInView | IntersectionObserver wrapper for section entrance animations |
| useIsometricScroll | Scroll-driven perspective origin shift |

## Animation Implementation

| Animation | Library | Implementation Approach | Complexity |
|---|---|---|---|
| Hero letter pop-in | Framer Motion | `staggerChildren` on name container, each letter `scale: 0→1` with spring bounce | Medium |
| Starfield twinkle | CSS | Pure CSS `@keyframes` opacity toggle on random stars | Low |
| Grid floor slide-up | Framer Motion | `translateY: "100%" → "0"` on page load | Low |
| Floating blocks drift | CSS | `@keyframes` with random `translateX/Y` per block, infinite linear | Low |
| Profile pixelit hover | Custom Hook | `usePixelit` — calls pixelit.draw() on mouseenter, resets on mouseleave | High |
| Pixel corner slide-out | Framer Motion | `whileHover` translates each corner 8px outward | Low |
| Section entrance | Framer Motion | `useInView` trigger + `translateY: 40→0, opacity: 0→1` | Low |
| Isometric scroll tilt | GSAP ScrollTrigger | Animate `perspectiveOrigin` from `50% 30%` to `50% 70%` on scroll | Medium |
| Project carousel 3D | Framer Motion | `rotateY` ±8° on side cards, `translateZ: 40px` on hover | High |
| Skill blocks isometric grid | CSS + Framer Motion | Container: `rotateX(55deg) rotateZ(-45deg)`. Blocks: staggered pop-up with `translateZ` | High |
| Skill block 3D extrusion | CSS `::before/::after` | Pseudo-elements in darker shades creating cube side walls | Medium |
| Stat mouse-follow tilt | Custom Hook | `useMouseTilt` — calculates rotateX/Y from mouse position relative to element | Medium |
| Button 3D press | CSS | `box-shadow` layers, `translateY` on :hover/:active | Low |
| Nav pixel-block hover | Framer Motion | `whileHover` slides 8×8px block from left | Low |
| Mobile menu overlay | Framer Motion | `AnimatePresence` fade in/out | Low |
| Heartbeat animation | CSS | `@keyframes scale` pulse on footer heart icon | Low |

## State & Logic

- **No global state management** (Redux/Zustand) needed — this is a presentation site.
- **Local state only:**
  - Mobile menu open/close (Navbar)
  - Active navigation section (scroll spy — which section is in viewport)
  - Pixelit hover state (Hero profile)
- **Scroll spy implementation:** IntersectionObserver on each section, update active nav item. Stored in Navbar local state.
- **Form handling:** Contact form uses uncontrolled inputs with native `onSubmit`. No backend — show a success toast (use sonner from shadcn/ui) with message "Message sent! (Demo only — no backend connected)"

## Other Key Decisions

### Pixelit Integration Strategy
Since pixelit is a vanilla JS library, we'll:
1. Load it via CDN script tag in `index.html`: `<script src="https://cdn.jsdelivr.net/npm/pixelit@latest/dist/pixelit.min.js"></script>`
2. Create a `usePixelit` hook that:
   - Accepts a ref to an `<img>` element
   - On mount, stores the original `src`
   - On `mouseenter`, instantiates `new window.Pixelit(...)` with `blockSize: 8` and calls `.draw()`
   - On `mouseleave`, restores the original image src
3. The hook handles cleanup (removing canvas elements pixelit creates)

### 3D Transform Architecture
- Hero section: Uses CSS `perspective: 1000px` on container, `transform-style: preserve-3d` on wrapper
- Projects carousel: `perspective: 1200px` on carousel container, each card has `transform: rotateY()` based on position
- Skills grid: `perspective: 1500px`, container rotated with `rotateX(55deg) rotateZ(-45deg)`, individual blocks use `translateZ` for height variation
- Stats blocks: Per-element `perspective: 800px`, tilt calculated from mouse position

### Responsive Breakpoints
- Desktop > 1024px: Full 3D effects, isometric grid, mouse parallax
- Tablet 768–1024px: Reduced 3D (simpler transforms), no mouse parallax
- Mobile < 768px: Flat 2D layout, no 3D transforms, simplified animations

### prefers-reduced-motion
- All CSS animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- Framer Motion animations check `useReducedMotion()` hook
- Floating blocks animation paused, entrance animations become simple opacity fades
