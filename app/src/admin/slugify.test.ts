import { slugify } from './slugify';
it.each([
  ['Kanban Task Management', 'kanban-task-management'],
  ['  Hello,  World!! ', 'hello-world'],
  ['Next.js 16 + .NET 10', 'next-js-16-net-10'],
  ['ระบบ Kanban', 'kanban'],
  ['---', ''],
])('%s → %s', (input, out) => expect(slugify(input)).toBe(out));
it('caps at 80 chars without a trailing dash', () => {
  const s = slugify('a'.repeat(79) + ' b');
  expect(s.length).toBeLessThanOrEqual(80);
  expect(s.endsWith('-')).toBe(false);
});
