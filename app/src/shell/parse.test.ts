import { parse } from './parse';
it.each([
  ['', null],
  ['   ', null],
  ['ls', { cmd: 'ls', args: [] }],
  ['  cat   ~/projects/kanban  ', { cmd: 'cat', args: ['~/projects/kanban'] }],
  ['echo "hello world" x', { cmd: 'echo', args: ['hello world', 'x'] }],
  ["echo 'a b'", { cmd: 'echo', args: ['a b'] }],
  ['echo a\\ b', { cmd: 'echo', args: ['a b'] }],
  ['LS', { cmd: 'ls', args: [] }],
])('parse(%j)', (input, expected) => expect(parse(input)).toEqual(expected));
it('treats an unterminated quote as running to end of line', () => {
  expect(parse('echo "abc')).toEqual({ cmd: 'echo', args: ['abc'] });
});
