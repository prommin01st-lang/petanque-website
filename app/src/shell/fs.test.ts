import { normalize, resolve, root, skillSlug } from './fs';
import type { ShellData } from './types';

const data: ShellData = {
  projects: async () => [{ slug: 'kanban', name: { en: 'Kanban', th: 'คันบัน' }, description: { en: 'd', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: true }],
  posts: async () => [{ slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, tags: [], coverUrl: '', publishedAt: '2026-10-09T00:00:00.000Z' }],
  post: async () => null,
};

it.each([
  ['~', '~', '~'], ['projects', '~', '~/projects'], ['/home/guest/blog', '~', '~/blog'],
  ['..', '~/projects', '~'], ['../blog/', '~/projects', '~/blog'], ['.', '~/skills', '~/skills'],
  ['../..', '~/projects', '~'], ['~/projects/kanban', '~/blog', '~/projects/kanban'],
])('normalize(%j, %j) = %j', (input, cwd, out) => expect(normalize(input, cwd)).toBe(out));

it('lists home', async () => {
  const kids = await (root(data) as Extract<ReturnType<typeof root>, { kind: 'dir' }>).children();
  expect(kids.map((k) => k.name)).toEqual(['about.md', 'skills', 'projects', 'blog']);
});
it('resolves project and post files', async () => {
  expect(await resolve('~/projects/kanban', data)).toMatchObject({ kind: 'file', ref: { type: 'project', slug: 'kanban' } });
  expect(await resolve('~/blog/hello', data)).toMatchObject({ kind: 'file', ref: { type: 'post', slug: 'hello' } });
  expect(await resolve('~/projects/nope', data)).toBeNull();
  expect(await resolve('~/skills/backend', data)).toMatchObject({ kind: 'dir', name: 'backend' });
});

it.each([
  ['Google OAuth/Calendar', 'google-oauth-calendar'], ['.NET 10', '.net-10'],
  ['C#', 'c#'], ['Next.js 14-16', 'next.js-14-16'],
])('skillSlug(%j) = %j', (n, s) => expect(skillSlug(n)).toBe(s));
it('resolves slugged skill files back to display names', async () => {
  expect(await resolve('~/skills/cloud-integrations/google-oauth-calendar', data)).toMatchObject({ kind: 'file', ref: { type: 'skill', skill: 'Google OAuth/Calendar' } });
});
