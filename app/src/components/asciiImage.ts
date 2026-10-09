/* ------------------------------------------------------------------ */
/*  Pure helpers for terminal-coloured image → ASCII rendering          */
/*  (no DOM / canvas access — unit-testable)                            */
/* ------------------------------------------------------------------ */

/**
 * 70-level brightness ramp (Paul Bourke), ordered DENSE → SPARSE.
 * Index 0 is the densest glyph (brightest cell on a dark terminal),
 * the final character is a space (darkest cell).
 */
export const BOURKE_RAMP =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

/** Levelled luminance above which the bright Tango variant is used. */
export const BRIGHT_THRESHOLD = 0.3;
/** Levelled luminance below which a cell renders as a space. */
export const SPACE_THRESHOLD = 0.04;
/** Saturation boost applied before snapping to the 16 colours. */
export const SATURATION_BOOST = 1.2;
/** Darkest colour a glyph may use (ANSI bright black) — never blends into the #0C0C0C bg. */
export const GLYPH_FLOOR = '#555753';

/** sRGB relative luminance (0..1) from 8-bit channels. */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Grid dimensions for a `cols`-wide ASCII render of a `w`×`h` image,
 * with monospace cell-aspect correction (cells are ~twice as tall as wide,
 * so sample half as many rows: rows = cols * h/w * 0.5).
 */
export function gridSize(w: number, h: number, cols: number): { cols: number; rows: number } {
  const safeCols = Math.max(1, Math.round(cols));
  const rows = w > 0 && h > 0 ? Math.max(1, Math.round(safeCols * (h / w) * 0.5)) : 1;
  return { cols: safeCols, rows };
}

/** Columns that fit `width` CSS px at ≥ `minCellPx` per cell, clamped to [minCols, maxCols]. */
export function colsForWidth(width: number, maxCols: number, minCellPx = 4.5, minCols = 16): number {
  if (!(width > 0)) return maxCols;
  return Math.max(Math.min(minCols, maxCols), Math.min(maxCols, Math.floor(width / minCellPx)));
}

/** Ramp index for a luminance value; bright cells map to dense glyphs. */
export function bourkeIndex(lum: number): number {
  const last = BOURKE_RAMP.length - 1;
  const clamped = lum < 0 ? 0 : lum > 1 ? 1 : lum;
  return Math.round((1 - clamped) * last);
}

/** Glyph for a luminance value. */
export function bourkeGlyph(lum: number): string {
  return BOURKE_RAMP[bourkeIndex(lum)];
}

/* ---- Auto-levels --------------------------------------------------- */

/** 2nd / 98th percentile of a set of luminances. */
export function autoLevels(lums: ArrayLike<number>): { lo: number; hi: number } {
  const n = lums.length;
  if (n === 0) return { lo: 0, hi: 1 };
  const sorted = Float64Array.from(lums).sort();
  return { lo: sorted[Math.floor(0.02 * (n - 1))], hi: sorted[Math.floor(0.98 * (n - 1))] };
}

/** Stretch `lum` to [lo,hi], clamp, then apply a 0.75 gamma (lifts mid-tones). */
export function levelLum(lum: number, lo: number, hi: number): number {
  const span = hi - lo;
  const t = span > 1e-6 ? (lum - lo) / span : lum;
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.pow(c, 0.75);
}

/** Scale chroma around the pixel's luminance by `f`, clamped to 0..255. */
export function saturate(r: number, g: number, b: number, f: number): [number, number, number] {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const s = (c: number) => {
    const v = l + (c - l) * f;
    return v < 0 ? 0 : v > 255 ? 255 : v;
  };
  return [s(r), s(g), s(b)];
}

/* ---- Tango ANSI palette (8 hues × normal/bright) ------------------- */

interface Hue {
  name: string;
  normal: string;
  bright: string;
}

/** Must equal the `ansi` colours in tailwind.config.js and the --ansi-* vars in index.css (drift-tested). */
export const TANGO: readonly Hue[] = [
  { name: 'black', normal: '#2E3436', bright: '#555753' },
  { name: 'red', normal: '#CC0000', bright: '#EF2929' },
  { name: 'green', normal: '#4E9A06', bright: '#8AE234' },
  { name: 'yellow', normal: '#C4A000', bright: '#FCE94F' },
  { name: 'blue', normal: '#3465A4', bright: '#729FCF' },
  { name: 'magenta', normal: '#75507B', bright: '#AD7FA8' },
  { name: 'cyan', normal: '#06989A', bright: '#34E2E2' },
  { name: 'white', normal: '#D3D7CF', bright: '#EEEEEC' },
];

export type TangoName = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';

/** Looks up one Tango hue by name (the single source for other palettes, e.g. the background shader). */
export function tango(name: TangoName): Hue {
  const h = TANGO.find((x) => x.name === name);
  if (!h) throw new Error(`unknown Tango hue: ${name}`);
  return h;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const TANGO_RGB = TANGO.map((h) => ({ normal: hexToRgb(h.normal), bright: hexToRgb(h.bright) }));

/** Perceptual "redmean" RGB distance (squared — monotonic, cheaper). */
function redmean(r: number, g: number, b: number, c: [number, number, number]): number {
  const rbar = (r + c[0]) / 2;
  const dr = r - c[0];
  const dg = g - c[1];
  const db = b - c[2];
  return (2 + rbar / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rbar) / 256) * db * db;
}

/**
 * Quantise an RGB colour to a Tango ANSI colour: the hue is the nearest of
 * all 16 colours by perceptual distance; the variant is chosen by `lum`
 * (default: the colour's own luminance) — bright above BRIGHT_THRESHOLD.
 * Deciding hue and brightness separately keeps saturated mid-tones from
 * collapsing to grey once auto-levels push them into the bright range.
 */
export function nearestAnsi(
  r: number,
  g: number,
  b: number,
  lum: number = luminance(r, g, b),
): { hex: string; bright: boolean } {
  const bright = lum > BRIGHT_THRESHOLD;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < TANGO_RGB.length; i++) {
    const d = Math.min(redmean(r, g, b, TANGO_RGB[i].normal), redmean(r, g, b, TANGO_RGB[i].bright));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { hex: bright ? TANGO[best].bright : TANGO[best].normal, bright };
}

/** Glyph colour: saturation boost → nearest Tango colour → floor at GLYPH_FLOOR. */
export function glyphColor(r: number, g: number, b: number, levelled: number): string {
  const [sr, sg, sb] = saturate(r, g, b, SATURATION_BOOST);
  const { hex } = nearestAnsi(sr, sg, sb, levelled);
  return hex === TANGO[0].normal ? GLYPH_FLOOR : hex;
}

export interface AsciiCell {
  glyph: string;
  color: string;
}

/** Build the auto-levelled, Tango-coloured ASCII grid from RGBA pixel data (cols×rows). */
export function buildCells(data: ArrayLike<number>, cols: number, rows: number): AsciiCell[] {
  const n = cols * rows;
  const lums = new Float64Array(n);
  for (let i = 0; i < n; i++) lums[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const { lo, hi } = autoLevels(lums);
  const cells: AsciiCell[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const l = levelLum(lums[i], lo, hi);
    cells[i] =
      l < SPACE_THRESHOLD
        ? { glyph: ' ', color: GLYPH_FLOOR }
        : { glyph: bourkeGlyph(l), color: glyphColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], l) };
  }
  return cells;
}

/**
 * Cells whose centre index (x,y) lies within radius `r` of the (possibly
 * fractional) centre (cx,cy), measured in cell-width units. `yScale` is the
 * cell height/width ratio, so a screen-space circle stays circular on
 * non-square cells. Clipped to the grid.
 */
export function cellsInRadius(
  cx: number,
  cy: number,
  r: number,
  cols: number,
  rows: number,
  yScale = 1,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const r2 = r * r;
  const ry = r / yScale;
  const y0 = Math.max(0, Math.ceil(cy - ry));
  const y1 = Math.min(rows - 1, Math.floor(cy + ry));
  const x0 = Math.max(0, Math.ceil(cx - r));
  const x1 = Math.min(cols - 1, Math.floor(cx + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = (y - cy) * yScale;
      if (dx * dx + dy * dy <= r2) out.push({ x, y });
    }
  }
  return out;
}

/** Deterministic [0,1) hash for seeded randomness (no Math.random at render). */
export function hashRand(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
