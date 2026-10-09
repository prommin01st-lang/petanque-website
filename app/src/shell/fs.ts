import { SKILL_CATEGORIES } from '@/data/skills';
import type { ShellData } from './types';

export type FileRef =
  | { type: 'about' }
  | { type: 'skill'; category: string; skill: string }
  | { type: 'project'; slug: string }
  | { type: 'post'; slug: string };
export type Node =
  | { kind: 'dir'; name: string; children: () => Promise<Node[]> }
  | { kind: 'file'; name: string; ref: FileRef };

export function normalize(input: string, cwd: string): string {
  let p = input.trim();
  if (p === '') return cwd;
  if (p.startsWith('/home/guest')) p = '~' + p.slice('/home/guest'.length);
  const parts = (p.startsWith('~') ? p.slice(1) : `${cwd.slice(1)}/${p}`).split('/');
  const stack: string[] = [];
  for (const s of parts) {
    if (!s || s === '.') continue;
    if (s === '..') stack.pop();
    else stack.push(s);
  }
  return stack.length ? `~/${stack.join('/')}` : '~';
}

export function skillSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.+#]+/g, '-').replace(/^-+|-+$/g, '');
}

const dir = (name: string, children: () => Promise<Node[]>): Node => ({ kind: 'dir', name, children });
const file = (name: string, ref: FileRef): Node => ({ kind: 'file', name, ref });

export function root(data: ShellData, signal?: AbortSignal): Node {
  return dir('~', async () => [
    file('about.md', { type: 'about' }),
    dir('skills', async () =>
      SKILL_CATEGORIES.map((c) =>
        dir(c.dir, async () => c.skills.map((s) => file(skillSlug(s), { type: 'skill', category: c.dir, skill: s }))),
      ),
    ),
    dir('projects', async () => (await data.projects(signal)).map((p) => file(p.slug, { type: 'project', slug: p.slug }))),
    dir('blog', async () => (await data.posts(signal)).map((p) => file(p.slug, { type: 'post', slug: p.slug }))),
  ]);
}

export async function resolve(path: string, data: ShellData, signal?: AbortSignal): Promise<Node | null> {
  let node: Node = root(data, signal);
  if (path === '~') return node;
  for (const seg of path.slice(2).split('/')) {
    if (node.kind !== 'dir') return null;
    const next: Node | undefined = (await node.children()).find((c) => c.name === seg);
    if (!next) return null;
    node = next;
  }
  return node;
}
