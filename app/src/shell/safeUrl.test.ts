import { classifyUrl } from './safeUrl';

describe('classifyUrl', () => {
  it.each([
    ['/blog/hello', { kind: 'internal', path: '/blog/hello' }],
    ['/', { kind: 'internal', path: '/' }],
    ['/#projects', { kind: 'internal', path: '/#projects' }],
    ['https://github.com/x/kanban', { kind: 'external', url: 'https://github.com/x/kanban' }],
    ['HTTP://Example.com', { kind: 'external', url: 'http://example.com/' }],
  ])('accepts %s', (raw, expected) => {
    expect(classifyUrl(raw)).toEqual(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>x</script>',
    '//evil.com',
    '/\\evil.com',
    'mailto:a@b.c',
    'ftp://x.y',
    'https://',
    'http://[bad',
    '',
    'relative/path',
    '/blog/\x1b]8;;x\x07',
    'https://x.y/\x07',
    'https://x.y/\x00',
    'https://x.y/\x7f',
    '/a\nb',
  ])('rejects %j', (raw) => {
    expect(classifyUrl(raw)).toEqual({ kind: 'reject' });
  });
});
