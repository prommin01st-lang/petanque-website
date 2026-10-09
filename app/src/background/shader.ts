/* ------------------------------------------------------------------ */
/*  GLSL ES 1.00 shaders (WebGL1 + WebGL2). The helper functions      */
/*  mirror asciiMath.ts exactly — keep them in sync.                  */
/* ------------------------------------------------------------------ */

import {
  NEAR_DENSITY, NEAR_SCRAMBLE_DENSITY, NEAR_WRAP, SCRAMBLE_TICK_PERIOD, STREAM_OFFSET, STREAM_PHASE_PRIME,
  STREAM_PRIME, STREAM_RATE, STREAM_SPREAD,
} from './asciiMath';
import { tango } from '@/components/asciiImage';

/** A JS number as a GLSL float literal (always has a decimal point). */
export function glf(n: number): string {
  const s = String(n);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

export const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const COMMON = /* glsl */ `
float hash21(vec2 p) {
  return fract(sin(p.x * 127.1 + p.y * 311.7) * 43758.5453);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}
float falloff(float dist, float radius) {
  return 1.0 - smoothstep(0.0, radius, dist);
}
float rampIndex(float lum, float len) {
  return min(len - 1.0, floor(clamp(lum, 0.0, 1.0) * len));
}
// Sine-free hashes (Hoskins) — keep inputs small; wrap with mod().
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/* ------------------------------------------------------------------ */
/*  Tango ANSI palette — derived from TANGO (asciiImage.ts), which is  */
/*  drift-tested against tailwind.config.js / index.css.               */
/* ------------------------------------------------------------------ */

/** Page background token (`bg` in tailwind.config.js); not an ANSI hue. */
const BG = '#0C0C0C';

export const FIELD_PALETTE = {
  BG,
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
} as const;

const glslVec3 = (h: string) =>
  `vec3(${[1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4)).join(', ')})`;
const PALETTE_GLSL = Object.entries(FIELD_PALETTE)
  .map(([name, h]) => `const vec3 ${name} = ${glslVec3(h)};`)
  .join('\n');

/**
 * Layered ASCII field, composited back-to-front in one pass:
 *   far  — small dim grey glyphs, slow drift            (parallax 0.15)
 *   mid  — base cells, noise + rain columns, green/cyan (parallax 0.35)
 *   near — large, very sparse bright glyphs, float/flicker + glow (0.7)
 * then CRT post: scanlines, vignette, phosphor bloom, slow flicker.
 *
 * Cells are laid out from the top-left (so rain falls down); `uCell*` are
 * (w, h) device-px cell sizes and `uOff*` the per-layer parallax offsets
 * (device px, top-left origin). `uMouse` is device px with a bottom-left
 * origin, (-1e4, -1e4) when absent. `uLite` = 1 drops the near layer and bloom.
 */
export const FRAG_ASCII = /* glsl */ `
precision highp float;
uniform sampler2D uRampFar;
uniform sampler2D uRampMid;
uniform sampler2D uScrambleMid;
uniform sampler2D uGlyphNear;
uniform sampler2D uTrail;
uniform float uRampCount;
uniform float uScrambleCount;
uniform vec2 uCellFar;
uniform vec2 uCellMid;
uniform vec2 uCellNear;
uniform vec2 uOffFar;
uniform vec2 uOffMid;
uniform vec2 uOffNear;
uniform float uTime;
uniform float uScrambleRadius;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uLite;
uniform float uIntensity;
uniform float uScan;
uniform float uNearDrift;
${PALETTE_GLSL}
${COMMON}

float glyphMask(sampler2D atlas, float count, float g, vec2 local) {
  return texture2D(atlas, vec2((g + local.x) / count, local.y)).r;
}

// Scramble strength (cursor falloff or drag trail) at a top-left screen point.
float scrambleAt(vec2 tl) {
  vec2 bl = vec2(tl.x, uResolution.y - tl.y);
  float trail = texture2D(uTrail, clamp(bl / uResolution, 0.0, 1.0)).r;
  return max(falloff(distance(bl, uMouse), uScrambleRadius), trail);
}

// Mirrors streamColumn() / streamPhase() in asciiMath.ts.
float streamOn(float cx) {
  return 1.0 - step(${glf(STREAM_RATE)}, hash11(mod(cx, ${glf(STREAM_PRIME)}) * ${glf(STREAM_SPREAD)} + ${glf(STREAM_OFFSET)}));
}
float streamLum(float cx, float cy) {
  if (streamOn(cx) < 0.5) return 0.0;
  float speed = 0.5 + hash11(mod(cx, ${glf(STREAM_PRIME)}) * 1.3 + 7.5);
  float phase = hash11(mod(cx, ${glf(STREAM_PHASE_PRIME)}) * 0.73 + 4.5);
  float s = fract(-uTime * 0.15 * speed + cy * 0.02 + phase);
  return s * s;
}
vec3 headColour(float cx) {
  return mix(B_GREEN, B_CYAN, step(0.5, hash11(mod(cx, ${glf(STREAM_PRIME)}) * 2.3 + 1.5)));
}

// Soft radial falloff from a cell centre (local cell units) over 1.25 cell widths.
float bloomKernel(vec2 local, vec2 centre) {
  float d = length((local - centre) * uCellMid) / (uCellMid.x * 1.25);
  return max(0.0, 1.0 - d);
}

vec3 brightColour(float h) {
  if (h < 0.25) return B_CYAN;
  if (h < 0.5) return B_GREEN;
  if (h < 0.75) return B_MAGENTA;
  return B_YELLOW;
}
vec3 scrambleColour(float h) {
  if (h < 0.1667) return B_CYAN;
  if (h < 0.3333) return B_GREEN;
  if (h < 0.5) return B_MAGENTA;
  if (h < 0.6667) return B_YELLOW;
  if (h < 0.8333) return B_BLUE;
  return B_RED;
}

void main() {
  vec2 fc = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  // 20 Hz scramble tick, wrapped to 64 so hash arguments stay well-conditioned
  // (mirrors scrambleTick in asciiMath.ts).
  float tick = mod(floor(uTime * 20.0), ${glf(SCRAMBLE_TICK_PERIOD)});
  vec3 col = BG;

  /* ---- far layer ---- */
  vec2 pF = (fc + uOffFar) / uCellFar;
  vec2 cF = floor(pF);
  float nF = valueNoise(cF * vec2(0.045, 0.045 * uCellFar.y / uCellFar.x) + vec2(uTime * 0.012, -uTime * 0.008));
  float lumF = 0.04 + 0.34 * nF;
  float mF = glyphMask(uRampFar, uRampCount, rampIndex(lumF, uRampCount), pF - cF);
  col = mix(col, mix(FAR_LO, FAR_HI, nF), mF * 0.85);

  /* ---- mid layer ---- */
  vec2 pM = (fc + uOffMid) / uCellMid;
  vec2 cM = floor(pM);
  vec2 lM = pM - cM;
  // Noise frequency is scaled by the cell aspect so blobs stay round on screen.
  float nM = valueNoise(cM * vec2(0.07, 0.07 * uCellMid.y / uCellMid.x) + vec2(uTime * 0.04, uTime * 0.025));
  float st = streamLum(cM.x, cM.y);
  float lumM = 0.4 * nM * nM + 0.75 * st;
  float tint = smoothstep(0.35, 0.65, valueNoise(cM * vec2(0.018, 0.03) + vec2(-uTime * 0.02, 3.0)));
  vec3 head = headColour(cM.x);
  vec3 colM = mix(GREEN, CYAN, tint) * (0.6 + 0.4 * nM);
  colM = mix(colM, head, clamp(st * 1.2, 0.0, 1.0));
  float sM = scrambleAt((cM + 0.5) * uCellMid - uOffMid);
  float mM;
  if (hash21(cM + tick * vec2(7.0, 13.0)) < sM) {
    float g = floor(hash21(cM.yx + tick) * uScrambleCount);
    mM = glyphMask(uScrambleMid, uScrambleCount, g, lM);
    colM = scrambleColour(hash21(cM * 0.37 + tick * 3.0));
  } else {
    mM = glyphMask(uRampMid, uRampCount, rampIndex(lumM, uRampCount), lM);
  }
  col = mix(col, colM, mM);

  if (uLite < 0.5) {
    /* ---- phosphor bloom: 0.15 x rain brightness of this + neighbour cells,
       weighted by a soft radial kernel so the glow has no cell edges ---- */
    // Same column: this cell and the cells above/below share its head colour;
    // side neighbours glow in their own column's colour.
    float nb = st * bloomKernel(lM, vec2(0.5, 0.5));
    nb = max(nb, streamLum(cM.x, cM.y - 1.0) * bloomKernel(lM, vec2(0.5, -0.5)));
    nb = max(nb, streamLum(cM.x, cM.y + 1.0) * bloomKernel(lM, vec2(0.5, 1.5)));
    vec3 glow = head * nb;
    glow = max(glow, headColour(cM.x - 1.0) * streamLum(cM.x - 1.0, cM.y) * bloomKernel(lM, vec2(-0.5, 0.5)));
    glow = max(glow, headColour(cM.x + 1.0) * streamLum(cM.x + 1.0, cM.y) * bloomKernel(lM, vec2(1.5, 0.5)));
    col += 0.15 * glow * (1.0 - mM);

    /* ---- near layer ---- */
    // uNearDrift is the float offset in cells, wrapped by the 256-cell period.
    vec2 drift = vec2(0.0, uNearDrift * uCellNear.y);
    vec2 pN = (fc + uOffNear + drift) / uCellNear;
    vec2 cN = floor(pN);
    vec2 lN = pN - cN;
    vec2 wN = mod(cN, ${glf(NEAR_WRAP)});
    float hN = hash12(wN);
    // Only cells that could possibly show a glyph pay for the scramble lookup.
    float sN = hN < ${glf(NEAR_DENSITY + NEAR_SCRAMBLE_DENSITY)} ? scrambleAt((cN + 0.5) * uCellNear - uOffNear - drift) : 0.0;
    if (hN < ${glf(NEAR_DENSITY)} + ${glf(NEAR_SCRAMBLE_DENSITY)} * sN) {
      float phase = hash12(wN + 5.0) * 6.2832;
      float bob = 0.08 * sin(uTime * 0.8 + phase);
      vec2 lB = vec2(lN.x, lN.y - bob);
      float epoch = mod(floor(uTime * 0.3 + hash12(wN + 17.0) * 8.0), 64.0);
      float g = floor(hash12(wN + epoch * 3.0 + 1.0) * uScrambleCount);
      vec3 cc = brightColour(hash12(wN + 9.0));
      if (sN > 0.05) {
        g = floor(hash12(wN + tick * vec2(7.0, 13.0)) * uScrambleCount);
        cc = scrambleColour(hash12(wN + tick * 3.0 + 2.0));
      }
      float inside = step(0.0, lB.y) * step(lB.y, 1.0);
      float mN = glyphMask(uGlyphNear, uScrambleCount, g, clamp(lB, 0.0, 1.0)) * inside;
      float flick = (0.7 + 0.3 * sin(uTime * (1.5 + 2.0 * hash12(wN + 3.0)) + phase))
        * step(0.06, hash12(wN + mod(floor(uTime * 8.0), 64.0) * 1.7));
      float d = length((lB - 0.5) * uCellNear) / (0.5 * uCellNear.x);
      col += cc * 0.14 * flick * (1.0 - smoothstep(0.0, 1.0, d));
      col = mix(col, cc * flick, mN);
    }
  }

  /* ---- intensity + CRT post ---- */
  col = BG + (col - BG) * uIntensity;
  // uScan = 0 when canvas px don't map 1:1 to device px (would alias).
  float scan = mod(gl_FragCoord.y, 2.0) < 1.0 ? 1.0 - 0.06 * uScan : 1.0;
  vec2 uv = gl_FragCoord.xy / uResolution;
  float vig = 1.0 - 0.35 * smoothstep(0.2, 1.0, length((uv - 0.5) * 2.0) * 0.7071);
  float flicker = 1.0 + 0.02 * (0.6 * sin(uTime * 0.9) + 0.4 * sin(uTime * 2.3 + 1.0));
  gl_FragColor = vec4(col * scan * vig * flicker, 1.0);
}
`;

/**
 * Pointer trail (ping-pong): decays the previous frame and adds Gaussian
 * splats at up to 8 points along prev → current so fast drags stay
 * continuous. UV space, bottom-left origin; `uAspect` = width / height.
 */
export const FRAG_TRAIL = /* glsl */ `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform vec2 uMousePrev;
uniform float uDecay;
uniform float uActive;
uniform float uSamples;
uniform float uRadius;
uniform float uAspect;
uniform float uEpsilon;
varying vec2 vUv;
void main() {
  float v = max(0.0, texture2D(uPrev, vUv).r * uDecay - uEpsilon);
  if (uActive > 0.5) {
    float splat = 0.0;
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uSamples) break;
      vec2 p = mix(uMousePrev, uMouse, (float(i) + 1.0) / uSamples);
      vec2 d = vUv - p;
      d.x *= uAspect;
      splat = max(splat, exp(-dot(d, d) / (uRadius * uRadius)));
    }
    v += splat;
  }
  gl_FragColor = vec4(min(v, 1.0), 0.0, 0.0, 1.0);
}
`;
