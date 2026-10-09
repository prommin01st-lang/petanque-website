import {
  PARALLAX, RAMP, SCRAMBLE, SCRAMBLE_TICK_PERIOD, STREAM_PRIME, STREAM_RATE, cellHeight, cellOf, easeToward, falloff, gmod,
  hash11, hash12, hash21, layerCells, liteMode, luminance, nearActive, parallaxOffset, pointerOffset, rampIndex,
  scrambleActive, scrambleTick, streamColumn, streamPhase, nearDrift, NEAR_WRAP,
} from './asciiMath';

describe('asciiMath', () => {
  it('maps luminance onto the ramp ends', () => {
    expect(RAMP[rampIndex(0)]).toBe(' ');
    expect(RAMP[rampIndex(1)]).toBe('@');
    expect(rampIndex(-3)).toBe(0);
    expect(rampIndex(9)).toBe(RAMP.length - 1);
  });
  it('luminance weights green highest', () => {
    expect(luminance(0, 1, 0)).toBeGreaterThan(luminance(1, 0, 0));
    expect(luminance(1, 1, 1)).toBeCloseTo(1, 5);
  });
  it('falloff is 1 at the cursor and 0 beyond the radius', () => {
    expect(falloff(0, 120)).toBe(1);
    expect(falloff(120, 120)).toBe(0);
    expect(falloff(200, 120)).toBe(0);
    const mid = falloff(60, 120);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
  it('hash21 is deterministic and in [0,1)', () => {
    for (let i = 0; i < 100; i++) {
      const h = hash21(i * 3.1, i * 7.7);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(hash21(i * 3.1, i * 7.7)).toBe(h);
    }
  });
  it('cellOf buckets pixels', () => {
    expect(cellOf(15, 16, 8)).toEqual([1, 2]);
  });
  it('scramble probability follows strength', () => {
    let on = 0;
    for (let x = 0; x < 50; x++) for (let y = 0; y < 50; y++) if (scrambleActive(0.3, x, y, 4)) on++;
    expect(on / 2500).toBeGreaterThan(0.2);
    expect(on / 2500).toBeLessThan(0.4);
    expect(scrambleActive(0, 1, 1, 1)).toBe(false);
  });
  it('scramble set has no whitespace', () => {
    expect(SCRAMBLE).not.toContain(' ');
  });
  it('scramble tick runs at 20 Hz and wraps to a small period', () => {
    expect(SCRAMBLE_TICK_PERIOD).toBe(64);
    expect(scrambleTick(0)).toBe(0);
    expect(scrambleTick(0.05)).toBe(1);
    expect(scrambleTick(3.2)).toBe(0);
    for (const t of [0, 1.234, 99.9, 3600, 86400.5]) {
      const tick = scrambleTick(t);
      expect(tick).toBeGreaterThanOrEqual(0);
      expect(tick).toBeLessThan(64);
      expect(Number.isInteger(tick)).toBe(true);
    }
  });
});

describe('asciiMath — layered field helpers', () => {
  it('gmod matches GLSL mod for negative inputs', () => {
    expect(gmod(5, 3)).toBe(2);
    expect(gmod(-1, 251)).toBe(250);
    expect(gmod(-251, 251)).toBe(0);
  });
  it('hash11 / hash12 are deterministic and in [0,1)', () => {
    for (let i = -50; i < 300; i++) {
      const a = hash11(i);
      const b = hash12(i, i * 3 + 1);
      for (const h of [a, b]) {
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
      expect(hash11(i)).toBe(a);
      expect(hash12(i, i * 3 + 1)).toBe(b);
    }
  });
  it('about 3.5% of columns rain at any width, negative columns included', () => {
    const frac = (from: number, to: number) => {
      let on = 0;
      for (let c = from; c < to; c++) if (streamColumn(c)) on++;
      return on / (to - from);
    };
    expect(STREAM_RATE).toBe(0.035);
    expect(frac(0, STREAM_PRIME)).toBeGreaterThan(0.025);
    expect(frac(0, STREAM_PRIME)).toBeLessThan(0.05);
    for (const cols of [120, 180, 240, 320, 480]) {
      expect(frac(0, cols)).toBeGreaterThan(0.015);
      expect(frac(0, cols)).toBeLessThan(0.06);
    }
    // Evenly spread: every 48-column window (384 px at 8 px cells) has rain.
    for (let start = 0; start < STREAM_PRIME; start += 12) expect(frac(start, start + 48)).toBeGreaterThan(0);
    expect(streamColumn(-1)).toBe(streamColumn(STREAM_PRIME - 1));
  });
  it('near glyphs are sparse (< 1% of cells) but present', () => {
    let on = 0;
    for (let x = 0; x < 256; x++) for (let y = 0; y < 256; y++) if (nearActive(x, y)) on++;
    expect(on / 65536).toBeLessThan(0.01);
    expect(on / 65536).toBeGreaterThan(0.003);
    expect(nearActive(-3, -7)).toBe(nearActive(253, 249));
  });
  it('layer cells follow the brief at the base cell size', () => {
    expect(layerCells(8)).toEqual({ far: [6, 11], mid: [8, 14], near: [14, 24] });
    const m = layerCells(10);
    expect(m.mid).toEqual([10, cellHeight(10)]);
    for (const [w, h] of [m.far, m.mid, m.near]) expect(h).toBeGreaterThan(w);
  });
  it('pointerOffset maps the viewport to -1..1 from its centre and clamps', () => {
    expect(pointerOffset(500, 300, 1000, 600)).toEqual([0, 0]);
    expect(pointerOffset(0, 0, 1000, 600)).toEqual([-1, -1]);
    expect(pointerOffset(1000, 600, 1000, 600)).toEqual([1, 1]);
    expect(pointerOffset(5000, -900, 1000, 600)).toEqual([1, -1]);
  });
  it('parallaxOffset scales with the layer factor (far < mid < near)', () => {
    expect(PARALLAX).toEqual({ far: 0.15, mid: 0.35, near: 0.7 });
    const at = (f: number) => parallaxOffset([1, -0.5], 1000, f);
    const [fx, fy] = at(PARALLAX.far);
    const [nx, ny] = at(PARALLAX.near);
    expect(nx).toBeCloseTo(fx * (0.7 / 0.15), 6);
    expect(ny).toBeCloseTo(fy * (0.7 / 0.15), 6);
    expect(parallaxOffset([0, 0], 0, 0.7)).toEqual([0, 0]);
    // Scrolling down shifts every layer up (positive top-left y offset), less than the page.
    const [, sy] = parallaxOffset([0, 0], 1000, PARALLAX.near);
    expect(sy).toBeGreaterThan(0);
    expect(sy).toBeLessThan(1000);
  });
  it('easeToward converges without overshoot and is frame-rate independent', () => {
    expect(easeToward(0, 10, 0, 8)).toBe(0);
    const one = easeToward(0, 10, 0.1, 8);
    const two = easeToward(easeToward(0, 10, 0.05, 8), 10, 0.05, 8);
    expect(one).toBeCloseTo(two, 6);
    expect(one).toBeGreaterThan(0);
    expect(one).toBeLessThan(10);
    expect(easeToward(0, 10, 100, 8)).toBeCloseTo(10, 6);
  });
  it('liteMode drops the near layer on narrow or coarse-pointer viewports', () => {
    expect(liteMode(767, false)).toBe(true);
    expect(liteMode(768, false)).toBe(false);
    expect(liteMode(1920, true)).toBe(true);
  });
});

describe('asciiMath — stream phase and near drift', () => {
  it('rain phase differs between a column and its 251-column repeat', () => {
    let same = 0;
    for (let c = 0; c < STREAM_PRIME; c++) if (Math.abs(streamPhase(c) - streamPhase(c + STREAM_PRIME)) < 0.02) same++;
    expect(same).toBeLessThan(10);
    for (let c = -5; c < 600; c++) {
      expect(streamPhase(c)).toBeGreaterThanOrEqual(0);
      expect(streamPhase(c)).toBeLessThan(1);
    }
  });
  it('near drift wraps by the 256-cell period', () => {
    expect(nearDrift(0)).toBe(0);
    expect(nearDrift(10)).toBeCloseTo(2, 9);
    expect(nearDrift(NEAR_WRAP / 0.2)).toBeCloseTo(0, 6);
    for (const t of [0, 1.5, 999, 86400]) {
      expect(nearDrift(t)).toBeGreaterThanOrEqual(0);
      expect(nearDrift(t)).toBeLessThan(NEAR_WRAP);
    }
  });
});

describe('asciiMath — allocation-free outputs', () => {
  it('pointerOffset / parallaxOffset write into a supplied buffer', () => {
    const out = new Float32Array(2);
    expect(pointerOffset(1000, 0, 1000, 600, out)).toBe(out);
    expect(Array.from(out)).toEqual([1, -1]);
    expect(parallaxOffset(out, 0, 0.5, out)).toBe(out);
    expect(Array.from(out)).toEqual([24, -24]);
  });
});
