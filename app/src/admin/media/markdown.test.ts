import { mediaMarkdown } from './markdown';

it('escapes brackets and backslashes in alt text', () => {
  expect(mediaMarkdown({ originalName: 'shot [v2].png', url: '/u/a.png' })).toBe('![shot \\[v2\\].png](/u/a.png)');
  expect(mediaMarkdown({ originalName: 'a]b.png', url: '/u/a.png' })).toBe('![a\\]b.png](/u/a.png)');
  expect(mediaMarkdown({ originalName: 'a\\b\nc.png', url: '/u/a.png' })).toBe('![a\\\\b c.png](/u/a.png)');
});
