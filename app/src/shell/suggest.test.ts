import { distance, suggest } from './suggest';
it('levenshtein', () => { expect(distance('ls', 'sl')).toBe(2); expect(distance('cat', 'cat')).toBe(0); });
it('suggests within 2', () => {
  expect(suggest('lss', ['ls', 'cat'])).toBe('ls');
  expect(suggest('hepl', ['help', 'history'])).toBe('help');
  expect(suggest('zzzzz', ['ls'])).toBeNull();
});
