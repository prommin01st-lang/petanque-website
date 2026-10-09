import { describe, expect, it } from 'vitest';
import { readMinutes } from './readTime';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');
const thai = (n: number) => 'ก'.repeat(n);

describe('readMinutes', () => {
  it('is at least one minute', () => {
    expect(readMinutes('')).toBe(1);
    expect(readMinutes('hi')).toBe(1);
  });

  it('counts latin text at 200 words per minute', () => {
    expect(readMinutes(words(200))).toBe(1);
    expect(readMinutes(words(201))).toBe(2);
    expect(readMinutes(words(1000))).toBe(5);
  });

  it('counts Thai script by characters at ~1000 per minute', () => {
    // Thai has no spaces between words: 3000 chars is one "word" by whitespace but ~3 minutes.
    expect(readMinutes(thai(3000))).toBe(3);
    expect(readMinutes(`${thai(1500)} ${thai(1500)}`)).toBe(3);
  });

  it('sums Thai characters and other words in mixed text', () => {
    // 1000 Thai chars (1 min) + 400 English words (2 min) = 3 min
    expect(readMinutes(`${thai(500)} ${words(400)} ${thai(500)}`)).toBe(3);
  });
});
