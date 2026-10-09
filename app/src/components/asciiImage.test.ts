import { FIELD_PALETTE, FRAG_ASCII } from '@/background/shader';
import {
  autoLevels,
  BOURKE_RAMP,
  bourkeGlyph,
  bourkeIndex,
  BRIGHT_THRESHOLD,
  buildCells,
  cellsInRadius,
  colsForWidth,
  GLYPH_FLOOR,
  glyphColor,
  gridSize,
  hashRand,
  levelLum,
  luminance,
  nearestAnsi,
  saturate,
  tango,
  TANGO,
} from './asciiImage';

describe('bourke ramp', () => {
  it('is the 70-level Bourke ramp ending in a space', () => {
    expect(BOURKE_RAMP.length).toBe(70);
    expect(BOURKE_RAMP[BOURKE_RAMP.length - 1]).toBe(' ');
    expect(BOURKE_RAMP[0]).toBe('$');
  });

  it('maps bright cells to dense glyphs and dark cells to space', () => {
    expect(bourkeIndex(1)).toBe(0);
    expect(bourkeIndex(0)).toBe(BOURKE_RAMP.length - 1);
    expect(bourkeGlyph(1)).toBe('$');
    expect(bourkeGlyph(0)).toBe(' ');
  });

  it('clamps out-of-range luminance', () => {
    expect(bourkeIndex(2)).toBe(0);
    expect(bourkeIndex(-1)).toBe(BOURKE_RAMP.length - 1);
  });
});

describe('luminance', () => {
  it('weights green most and blue least (sRGB)', () => {
    expect(luminance(0, 0, 0)).toBe(0);
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 5);
    expect(luminance(0, 255, 0)).toBeGreaterThan(luminance(255, 0, 0));
    expect(luminance(255, 0, 0)).toBeGreaterThan(luminance(0, 0, 255));
  });
});

describe('gridSize', () => {
  it('applies cell-aspect correction (half the rows)', () => {
    expect(gridSize(1000, 1000, 64)).toEqual({ cols: 64, rows: 32 });
    expect(gridSize(1000, 500, 40)).toEqual({ cols: 40, rows: 10 });
  });

  it('never returns zero dimensions', () => {
    expect(gridSize(0, 0, 24)).toEqual({ cols: 24, rows: 1 });
    expect(gridSize(1000, 1, 10).rows).toBeGreaterThanOrEqual(1);
  });
});

describe('colsForWidth', () => {
  it('targets cells of at least 4.5px, capped at maxCols', () => {
    expect(colsForWidth(380, 88)).toBe(84); // floor(380 / 4.5)
    expect(colsForWidth(1000, 88)).toBe(88);
    expect(colsForWidth(326, 88)).toBe(72);
  });

  it('falls back to maxCols when the width is unknown and floors at minCols', () => {
    expect(colsForWidth(0, 80)).toBe(80);
    expect(colsForWidth(20, 80)).toBe(16);
  });
});

describe('auto-levels', () => {
  it('takes the 2nd and 98th percentiles', () => {
    const lums = Array.from({ length: 101 }, (_, i) => i / 100);
    expect(autoLevels(lums)).toEqual({ lo: 0.02, hi: 0.98 });
  });

  it('stretches, clamps and applies a 0.75 gamma', () => {
    expect(levelLum(0.2, 0.2, 0.6)).toBe(0);
    expect(levelLum(0.6, 0.2, 0.6)).toBe(1);
    expect(levelLum(0.4, 0.2, 0.6)).toBeCloseTo(Math.pow(0.5, 0.75), 6);
    expect(levelLum(0.9, 0.2, 0.6)).toBe(1);
  });

  it('lifts a dark, low-contrast image to the full range', () => {
    // pixels between 10 and 60 grey → after levelling the brightest is 1
    const px = [10, 20, 30, 40, 50, 60];
    const data = px.flatMap((v) => [v, v, v, 255]);
    const cells = buildCells(data, 6, 1);
    expect(cells[0].glyph).toBe(' ');
    expect(cells[5].glyph).toBe('$');
  });
});

describe('saturate', () => {
  it('keeps greys grey and pushes chroma away from luminance', () => {
    expect(saturate(100, 100, 100, 1.2).map(Math.round)).toEqual([100, 100, 100]);
    const [r, g] = saturate(200, 100, 100, 1.2);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(100);
  });
});

describe('nearestAnsi', () => {
  it('switches to the bright palette just above the 0.30 threshold', () => {
    expect(BRIGHT_THRESHOLD).toBe(0.3);
    expect(nearestAnsi(200, 30, 30, 0.29)).toEqual({ hex: '#CC0000', bright: false });
    expect(nearestAnsi(200, 30, 30, 0.31)).toEqual({ hex: '#EF2929', bright: true });
  });

  it('defaults to the colour’s own luminance', () => {
    expect(nearestAnsi(255, 255, 255).bright).toBe(true);
    expect(nearestAnsi(20, 20, 20).bright).toBe(false);
  });

  it('picks the hue from all 16 colours, then the variant by brightness', () => {
    // a mid green must stay green (not grey) whichever variant is used
    expect(nearestAnsi(10, 120, 10, 0.2).hex).toBe('#4E9A06');
    expect(nearestAnsi(10, 120, 10, 0.6).hex).toBe('#8AE234');
  });

  it('only ever returns a Tango colour', () => {
    const all = TANGO.flatMap((h) => [h.normal, h.bright]);
    for (let i = 0; i < 64; i++) {
      const { hex } = nearestAnsi((i * 37) % 256, (i * 71) % 256, (i * 113) % 256);
      expect(all).toContain(hex);
    }
  });
});

describe('glyphColor', () => {
  it('floors near-black glyphs at ANSI bright black', () => {
    expect(glyphColor(15, 15, 15, 0.1)).toBe(GLYPH_FLOOR);
  });

  it('snaps saturated colours to the matching hue', () => {
    expect(glyphColor(40, 160, 40, 0.6)).toBe('#8AE234');
  });
});

describe('cellsInRadius', () => {
  it('returns the centre and clips to the grid bounds', () => {
    const cells = cellsInRadius(0, 0, 1, 10, 10);
    expect(cells).toContainEqual({ x: 0, y: 0 });
    expect(cells).toContainEqual({ x: 1, y: 0 });
    expect(cells).toContainEqual({ x: 0, y: 1 });
    expect(cells.every((c) => c.x >= 0 && c.y >= 0)).toBe(true);
  });

  it('excludes cells outside the circle', () => {
    const cells = cellsInRadius(5, 5, 2, 20, 20);
    expect(cells).not.toContainEqual({ x: 7, y: 7 });
    expect(cells).toContainEqual({ x: 7, y: 5 });
  });

  it('handles a fractional centre', () => {
    const cells = cellsInRadius(2.5, 2.5, 0.75, 10, 10);
    expect(cells).toHaveLength(4);
    expect(cells).toEqual(
      expect.arrayContaining([
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ]),
    );
  });

  it('keeps a screen-space circle on tall cells (yScale)', () => {
    // radius 4 cell-widths; cells are 2× taller → only ±2 rows
    const cells = cellsInRadius(10, 10, 4, 40, 40, 2);
    const ys = cells.map((c) => c.y);
    expect(Math.min(...ys)).toBe(8);
    expect(Math.max(...ys)).toBe(12);
    expect(cells).toContainEqual({ x: 14, y: 10 });
  });
});

describe('hashRand', () => {
  it('is deterministic and in [0,1)', () => {
    expect(hashRand(3)).toBe(hashRand(3));
    for (let s = 0; s < 50; s++) {
      const v = hashRand(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('spreads evenly across many seeds', () => {
    const buckets = new Array(10).fill(0);
    const n = 10000;
    for (let s = 0; s < n; s++) buckets[Math.floor(hashRand(s) * 10)]++;
    for (const b of buckets) {
      expect(b).toBeGreaterThan(n / 10 * 0.8);
      expect(b).toBeLessThan(n / 10 * 1.2);
    }
  });
});

describe('Tango drift guard', () => {
  const names = TANGO.map((h) => h.name);
  let tailwindSrc = '';
  let indexCss = '';

  beforeAll(async () => {
    // Read the theme sources as plain text (CSS imports are stubbed under vitest).
    const fsModule = 'node:fs';
    const { readFileSync } = (await import(/* @vite-ignore */ fsModule)) as {
      readFileSync(path: string, encoding: 'utf8'): string;
    };
    // vitest runs with the app/ directory as cwd
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
    tailwindSrc = readFileSync(`${cwd}/tailwind.config.js`, 'utf8');
    indexCss = readFileSync(`${cwd}/src/index.css`, 'utf8');
  });

  it('matches the ansi colours in tailwind.config.js', () => {
    const block = tailwindSrc.slice(tailwindSrc.indexOf('ansi: {'));
    const brightAt = block.indexOf('bright: {');
    const normalPart = block.slice(0, brightAt);
    const brightPart = block.slice(brightAt, block.indexOf('}', brightAt));
    for (const h of TANGO) {
      expect(normalPart).toMatch(new RegExp(`\\b${h.name}: '${h.normal}'`, 'i'));
      expect(brightPart).toMatch(new RegExp(`\\b${h.name}: '${h.bright}'`, 'i'));
    }
    expect(names).toHaveLength(8);
  });

  it('matches the --ansi-* vars in index.css', () => {
    for (const h of TANGO) {
      expect(indexCss).toMatch(new RegExp(`--ansi-${h.name}:\\s*${h.normal};`, 'i'));
      expect(indexCss).toMatch(new RegExp(`--ansi-bright-${h.name}:\\s*${h.bright};`, 'i'));
    }
  });

  it('the background shader palette uses Tango colours (and the bg token)', () => {
    const expected: Record<keyof typeof FIELD_PALETTE, string> = {
      BG: tailwindSrc.match(/'bg': '(#[0-9A-F]{6})'/i)![1],
      FAR_LO: tango('black').normal,
      FAR_HI: tango('black').bright,
      GREEN: tango('green').normal,
      CYAN: tango('cyan').normal,
      B_GREEN: tango('green').bright,
      B_CYAN: tango('cyan').bright,
      B_MAGENTA: tango('magenta').bright,
      B_YELLOW: tango('yellow').bright,
      B_BLUE: tango('blue').bright,
      B_RED: tango('red').bright,
    };
    expect({ ...FIELD_PALETTE }).toEqual(expected);
    // and the GLSL actually carries those values
    for (const [name, hex] of Object.entries(FIELD_PALETTE)) {
      const v = [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4)).join(', ');
      expect(FRAG_ASCII).toContain(`const vec3 ${name} = vec3(${v});`);
    }
  });
});
