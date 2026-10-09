import { vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { Post, Project } from '@/lib/types';
import type { ShellContext } from './types';

const projects: Project[] = [
  {
    slug: 'kanban',
    name: { en: 'Kanban', th: 'Kanban' },
    description: { en: 'Realtime board', th: 'กระดานเรียลไทม์' },
    tags: ['react', 'signalr'],
    metric: '10k users',
    repoUrl: 'https://github.com/x/kanban',
    demoUrl: '',
    flagship: true,
  },
  {
    slug: 'docs',
    name: { en: 'Docs', th: 'Docs' },
    description: { en: 'Documentation site', th: 'เว็บเอกสาร' },
    tags: [],
    metric: '',
    repoUrl: '',
    demoUrl: '',
    flagship: false,
  },
];

const hello: Post = {
  slug: 'hello',
  title: { en: 'Hello', th: 'สวัสดี' },
  excerpt: { en: 'First post', th: 'โพสต์แรก' },
  tags: [],
  coverUrl: '',
  publishedAt: '2026-01-02T03:04:05Z',
  body: { en: 'body', th: 'เนื้อหา' },
};

const CALLED = ['setCwd', 'setLang', 'goSection', 'navigate', 'openExternal', 'clear', 'close'] as const;

export function makeTestCtx(overrides: Partial<ShellContext> = {}): ShellContext & { calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {};
  const rec = Object.fromEntries(
    CALLED.map((n) => [n, (...a: unknown[]) => void (calls[n] ??= []).push(a)]),
  ) as Pick<ShellContext, (typeof CALLED)[number]>;
  return {
    t: translations.en,
    lang: 'en',
    cwd: '~',
    history: [],
    signal: new AbortController().signal,
    data: {
      projects: vi.fn(async () => projects),
      posts: vi.fn(async () => [hello]),
      post: vi.fn(async (slug: string) => (slug === 'hello' ? hello : null)),
    },
    ...rec,
    ...overrides,
    calls,
  };
}
