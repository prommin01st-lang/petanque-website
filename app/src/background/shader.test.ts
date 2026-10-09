import { describe, expect, it } from 'vitest';
import {
  NEAR_DENSITY, NEAR_SCRAMBLE_DENSITY, NEAR_WRAP, SCRAMBLE_TICK_PERIOD, STREAM_OFFSET, STREAM_PHASE_PRIME,
  STREAM_PRIME, STREAM_RATE, STREAM_SPREAD,
} from './asciiMath';
import { FIELD_PALETTE, FRAG_ASCII, glf } from './shader';

describe('shader', () => {
  it('glf always emits a GLSL float literal', () => {
    expect(glf(251)).toBe('251.0');
    expect(glf(0.035)).toBe('0.035');
    expect(glf(-2)).toBe('-2.0');
  });
  it('FRAG_ASCII interpolates the JS constants (no drift between mirrors)', () => {
    expect(FRAG_ASCII).toContain(`mod(cx, ${glf(STREAM_PRIME)}) * ${glf(STREAM_SPREAD)} + ${glf(STREAM_OFFSET)}`);
    expect(FRAG_ASCII).toContain(`step(${glf(STREAM_RATE)},`);
    expect(FRAG_ASCII).toContain(`mod(cx, ${glf(STREAM_PHASE_PRIME)})`);
    expect(FRAG_ASCII).toContain(`mod(cN, ${glf(NEAR_WRAP)})`);
    expect(FRAG_ASCII).toContain(`${glf(NEAR_DENSITY)} + ${glf(NEAR_SCRAMBLE_DENSITY)} * sN`);
    expect(FRAG_ASCII).toContain(`mod(floor(uTime * 20.0), ${glf(SCRAMBLE_TICK_PERIOD)})`);
    for (const name of Object.keys(FIELD_PALETTE)) expect(FRAG_ASCII).toContain(`const vec3 ${name} =`);
  });
});
