import { normalize, resolve } from '../fs';
import type { SectionId } from '@/hooks/useActiveSection';
import type { Command } from '../types';
import { noSuchFile, notADir } from './util';

const SECTION_ALIASES: Record<string, SectionId> = {
  about: 'about',
  projects: 'projects',
  skills: 'skills',
  blog: 'blog',
  home: 'hero',
  hero: 'hero',
};
const DIR_SECTIONS = new Set(['projects', 'skills', 'blog']);

const cd: Command = {
  name: 'cd',
  summary: (t) => t.shell.help.cd,
  async run(args, ctx) {
    const raw = args[0];
    if (!raw || raw === '~' || raw === '~/') {
      ctx.setCwd('~');
      ctx.goSection('hero');
      return [];
    }
    const key = raw.toLowerCase().replace(/^~\//, '').replace(/\/$/, '');
    const section = Object.hasOwn(SECTION_ALIASES, key) ? SECTION_ALIASES[key] : undefined;
    if (section) {
      if (DIR_SECTIONS.has(key)) ctx.setCwd(`~/${key}`);
      ctx.goSection(section);
      return [];
    }
    const path = normalize(raw, ctx.cwd);
    const node = await resolve(path, ctx.data, ctx.signal);
    if (ctx.signal.aborted) return [];
    if (!node) return [`cd: ${noSuchFile(ctx, raw)}`];
    if (node.kind !== 'dir') return [`cd: ${notADir(ctx, raw)}`];
    ctx.setCwd(path);
    return [];
  },
};
export default cd;
