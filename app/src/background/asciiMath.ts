/* ------------------------------------------------------------------ */
/*  Pure ASCII-field math — mirrored exactly by the GLSL in shader.ts */
/* ------------------------------------------------------------------ */

/** Brightness ramp, ordered dark → light (ink density). */
export const RAMP = ' .:-=+*#%@';
/** Glyphs swapped in around the cursor / drag trail. No whitespace. */
export const SCRAMBLE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#%&@';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fract = (v: number) => v - Math.floor(v);

/** Relative luminance (Rec. 709 weights) of linear 0..1 channels. */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ramp index for a luminance value (clamped). */
export function rampIndex(lum: number, len: number = RAMP.length): number {
  return Math.min(len - 1, Math.floor(clamp01(lum) * len));
}

/** GLSL smoothstep. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** 1 at the cursor, smoothly 0 at and beyond `radius`. */
export function falloff(dist: number, radius: number): number {
  return 1 - smoothstep(0, radius, dist);
}

/** Classic sin-hash of a 2D point → [0, 1). */
export function hash21(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
}

/** Pixel → cell coordinates. `cell` is a square size or [w, h]. */
export function cellOf(px: number, py: number, cell: number | readonly [number, number]): [number, number] {
  const [w, h] = typeof cell === 'number' ? [cell, cell] : cell;
  return [Math.floor(px / w), Math.floor(py / h)];
}

/**
 * Scramble ticks run at 20 Hz and wrap every 64 ticks (3.2 s) so the hash
 * arguments `cell + tick*(7,13)` stay small and well-conditioned in float32
 * on the GPU (large sin() arguments lose precision). Mirrors FRAG_ASCII.
 */
export const SCRAMBLE_TICK_PERIOD = 64;
export function scrambleTick(timeSec: number): number {
  return Math.floor(timeSec * 20) % SCRAMBLE_TICK_PERIOD;
}

/** Whether a cell shows a scramble glyph at this tick for a given strength. */
export function scrambleActive(strength: number, cx: number, cy: number, tick: number): boolean {
  return hash21(cx + tick * 7, cy + tick * 13) < strength;
}

/** Bilinear value noise over hash21 lattice points, smoothstep-interpolated → [0, 1). */
export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Width:height ratio of a monospace character cell. */
export const CELL_ASPECT = 0.55;

/** Cell height (CSS px) for a given cell width, keeping the monospace aspect. */
export function cellHeight(width: number): number {
  return Math.floor(width / CELL_ASPECT);
}

/* ------------------------------------------------------------------ */
/*  Layered field (far / mid / near) — mirrored by FRAG_ASCII          */
/* ------------------------------------------------------------------ */

/** GLSL `mod` (result takes the sign of y, unlike JS `%`). */
export function gmod(x: number, y: number): number {
  return x - y * Math.floor(x / y);
}

/**
 * Sine-free 1D hash (Dave Hoskins "hash without sine"). Only small products
 * are formed, so float32 GPUs and float64 JS agree closely. Keep inputs
 * small (< ~1e3) — callers wrap with gmod.
 */
export function hash11(p: number): number {
  let x = fract(p * 0.1031);
  x *= x + 33.33;
  x *= x + x;
  return fract(x);
}

/** Sine-free 2D → 1D hash (Hoskins hash12). Keep inputs small. */
export function hash12(px: number, py: number): number {
  let x = fract(px * 0.1031);
  let y = fract(py * 0.1031);
  let z = fract(px * 0.1031);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return fract((x + y) * z);
}

/**
 * Rain columns: the integer column index is wrapped by a prime (keeps hash
 * arguments small on any GPU), then spread by 3.7 so the ~10 raining columns
 * per 251 are evenly placed (largest gap 39 columns ≈ 310 px at 8 px cells).
 */
export const STREAM_PRIME = 251;
export const STREAM_RATE = 0.035;
export const STREAM_SPREAD = 3.7;
export const STREAM_OFFSET = 0.5;
export function streamColumn(cx: number): boolean {
  return hash11(gmod(cx, STREAM_PRIME) * STREAM_SPREAD + STREAM_OFFSET) < STREAM_RATE;
}

/**
 * Per-column rain phase (0..1). Wrapped by a different prime than the column
 * choice, so a column and its 251-column repeat fall out of step.
 */
export const STREAM_PHASE_PRIME = 509;
export function streamPhase(cx: number): number {
  return hash11(gmod(cx, STREAM_PHASE_PRIME) * 0.73 + 4.5);
}

/** Near-layer glyph density (< 1% of near cells); cells wrap every 256. */
export const NEAR_WRAP = 256;
export const NEAR_DENSITY = 0.007;
/** Extra near-glyph density at full scramble strength. */
export const NEAR_SCRAMBLE_DENSITY = 0.04;
/** Near layer upward float speed (cells per second). */
export const NEAR_DRIFT_CELLS_PER_SEC = 0.2;
/** Near float offset in cells, wrapped by the 256-cell hash period (seamless). */
export function nearDrift(timeSec: number): number {
  return gmod(timeSec * NEAR_DRIFT_CELLS_PER_SEC, NEAR_WRAP);
}
export function nearActive(cx: number, cy: number): boolean {
  return hash12(gmod(cx, NEAR_WRAP), gmod(cy, NEAR_WRAP)) < NEAR_DENSITY;
}

export type CellSize = [w: number, h: number];

/** Per-layer cell sizes (CSS px) for a base (mid) cell width: 8 → 6×11 / 8×14 / 14×24. */
export function layerCells(cell: number): { far: CellSize; mid: CellSize; near: CellSize } {
  const farW = Math.max(1, Math.round(cell * 0.75));
  return {
    far: [farW, Math.round(farW / CELL_ASPECT)],
    mid: [cell, cellHeight(cell)],
    near: [Math.round(cell * 1.75), Math.round(cell * 3)],
  };
}

/** Parallax factor per layer (fraction of the full offset). */
export const PARALLAX = { far: 0.15, mid: 0.35, near: 0.7 } as const;
/** Full-strength mouse parallax (CSS px at the viewport edge). */
export const MOUSE_PARALLAX_PX = 48;
/** Full-strength scroll parallax (fraction of window.scrollY). */
export const SCROLL_PARALLAX = 0.5;

/** Pointer position (CSS px) → [-1, 1]² from the viewport centre, clamped. */
export function pointerOffset(
  x: number,
  y: number,
  w: number,
  h: number,
  out: [number, number] | Float32Array = [0, 0],
): [number, number] | Float32Array {
  out[0] = Math.min(1, Math.max(-1, (2 * x) / w - 1));
  out[1] = Math.min(1, Math.max(-1, (2 * y) / h - 1));
  return out;
}

/**
 * Layer sample offset (CSS px, top-left origin). Positive y moves the layer's
 * content up, so scrolling down drifts every layer up — slower than the page,
 * and slowest for the far layer.
 */
export function parallaxOffset(
  mouse: ArrayLike<number>,
  scrollPx: number,
  factor: number,
  out: [number, number] | Float32Array = [0, 0],
): [number, number] | Float32Array {
  out[0] = mouse[0] * MOUSE_PARALLAX_PX * factor;
  out[1] = mouse[1] * MOUSE_PARALLAX_PX * factor + scrollPx * SCROLL_PARALLAX * factor;
  return out;
}

/** Frame-rate-independent exponential ease toward `target` (`rate` per second). */
export function easeToward(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-dt * rate));
}

/** Mobile / touch: drop the near layer and bloom. */
export function liteMode(cssWidth: number, coarsePointer: boolean): boolean {
  return cssWidth < 768 || coarsePointer;
}
