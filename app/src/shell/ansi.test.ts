import { color, bold, link, stripAnsi, visibleWidth } from './ansi';
it('wraps colour codes', () => {
  expect(color('ok', 'green')).toBe('\x1b[32mok\x1b[0m');
  expect(color('ok', 'green', true)).toBe('\x1b[92mok\x1b[0m');
  expect(bold('x')).toBe('\x1b[1mx\x1b[0m');
});
it('builds OSC-8 links and strips them', () => {
  const l = link('https://e.com', 'site');
  expect(l).toBe('\x1b]8;;https://e.com\x07site\x1b]8;;\x07');
  expect(stripAnsi(color(l, 'blue'))).toBe('site');
});
it('counts Thai grapheme clusters', () => {
  expect(visibleWidth('ที่')).toBe(1);
  expect(visibleWidth(color('abc', 'red'))).toBe(3);
});
