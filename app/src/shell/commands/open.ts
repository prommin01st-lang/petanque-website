import { normalize, resolve } from '../fs';
import type { Node } from '../fs';
import type { Command } from '../types';
import { fmt, isADir, noSuchFile, usage } from './util';
import { classifyUrl } from '../safeUrl';

const open: Command = {
  name: 'open',
  summary: (t) => t.shell.help.open,
  async run(args, ctx) {
    const raw = args[0];
    if (!raw) return [usage(ctx, 'open <path|url>')];
    if (/^https?:\/\//i.test(raw)) {
      const c = classifyUrl(raw);
      if (c.kind !== 'external') return [`open: ${noSuchFile(ctx, raw)}`];
      ctx.openExternal(c.url);
      return [fmt(ctx.t.shell.opening, { path: raw })];
    }
    const candidates = [normalize(raw, ctx.cwd)];
    if (!raw.includes('/') && !raw.startsWith('~') && !raw.startsWith('.')) {
      candidates.push(`~/blog/${raw}`, `~/projects/${raw}`);
    }
    let node: Node | null = null;
    let path = candidates[0];
    for (const c of candidates) {
      node = await resolve(c, ctx.data, ctx.signal);
      if (node) {
        path = c;
        break;
      }
    }
    if (ctx.signal.aborted) return [];
    if (!node) return [`open: ${noSuchFile(ctx, raw)}`];
    if (node.kind === 'dir') return [`open: ${isADir(ctx, raw)}`];
    const opening = [fmt(ctx.t.shell.opening, { path })];
    const ref = node.ref;
    switch (ref.type) {
      case 'post':
        ctx.navigate(`/blog/${ref.slug}`);
        ctx.close();
        return opening;
      case 'project': {
        const p = (await ctx.data.projects(ctx.signal)).find((x) => x.slug === ref.slug);
        if (ctx.signal.aborted) return [];
        const repo = p?.repoUrl ? classifyUrl(p.repoUrl) : null;
        if (repo?.kind === 'external') {
          ctx.openExternal(repo.url);
          return opening;
        }
        ctx.goSection('projects');
        ctx.close();
        return [fmt(ctx.t.shell.noRepo, { path })];
      }
      case 'about':
        ctx.goSection('about');
        ctx.close();
        return opening;
      case 'skill':
        ctx.goSection('skills');
        ctx.close();
        return opening;
    }
  },
};
export default open;
