/** Thai script block (U+0E00–U+0E7F); Thai is written without spaces between words. */
const THAI = /[฀-๿]/g;
const WORDS_PER_MIN = 200;
const THAI_CHARS_PER_MIN = 1000;

/**
 * Estimated reading time in whole minutes (at least 1). Thai characters are
 * counted at ~1000/min, everything else by whitespace-separated words at
 * 200/min; mixed text sums both.
 */
export function readMinutes(text: string): number {
  const thaiChars = text.match(THAI)?.length ?? 0;
  const words = text.replace(THAI, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MIN + thaiChars / THAI_CHARS_PER_MIN));
}
