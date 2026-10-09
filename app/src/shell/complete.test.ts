import { complete } from './complete';
import type { ShellData } from './types';
const data: ShellData = {
  projects: async () => [
    { slug: 'kanban', name: { en: 'K', th: '' }, description: { en: '', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: true },
    { slug: 'kafka-lab', name: { en: 'Ka', th: '' }, description: { en: '', th: '' }, tags: [], metric: '', repoUrl: '', demoUrl: '', flagship: false },
  ],
  posts: async () => [], post: async () => null,
};
const CMDS = ['cat', 'cd', 'clear', 'help', 'ls'];
it('completes command names', async () => {
  expect(await complete('c', 1, CMDS, '~', data)).toEqual({ replaceFrom: 0, options: ['cat', 'cd', 'clear'] });
});
it('completes directories with a slash', async () => {
  expect(await complete('cd pro', 6, CMDS, '~', data)).toEqual({ replaceFrom: 3, options: ['projects/'] });
});
it('completes slugs inside a path', async () => {
  expect(await complete('cat ~/projects/ka', 17, CMDS, '~', data)).toEqual({ replaceFrom: 15, options: ['kafka-lab', 'kanban'] });
});
it('returns nothing for an unknown directory', async () => {
  expect(await complete('cat ~/nope/x', 12, CMDS, '~', data)).toEqual({ replaceFrom: 11, options: [] });
});
it('completes slugged skill names', async () => {
  expect(await complete('cat ~/skills/frontend/ne', 24, CMDS, '~', data)).toEqual({ replaceFrom: 22, options: ['next.js-14-16'] });
});
