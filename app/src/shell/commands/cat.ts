import { bold, color, link } from '../ansi';
import { normalize, resolve } from '../fs';
import { pick } from '@/lib/pick';
import type { Command } from '../types';
import { fmt, isADir, noSuchFile, usage } from './util';
import { classifyUrl, stripControl } from '../safeUrl';

const cat: Command = {
  name: 'cat',
  summary: (t) => t.shell.help.cat,
  async run(args, ctx) {
    const raw = args[0];
    if (!raw) return [usage(ctx, 'cat <file>')];
    const path = normalize(raw, ctx.cwd);
    const node = await resolve(path, ctx.data, ctx.signal);
    if (!node) return [`cat: ${noSuchFile(ctx, raw)}`];
    if (node.kind === 'dir') return [`cat: ${isADir(ctx, raw)}`];
    const ref = node.ref;
    switch (ref.type) {
      case 'about':
        return [ctx.t.about.bio1, ctx.t.about.bio2, ctx.t.about.bio3, ctx.t.about.bio4, ctx.t.about.bio5];
      case 'skill':
        return [`${ref.skill} (${ref.category})`];
      case 'project': {
        const p = (await ctx.data.projects(ctx.signal)).find((x) => x.slug === ref.slug);
        if (!p) return [`cat: ${noSuchFile(ctx, raw)}`];
        const out = [bold(pick(p.name, ctx.lang)), pick(p.description, ctx.lang)];
        if (p.tags.length) out.push(p.tags.map((tag) => color(`[${tag}]`, 'magenta', true)).join(' '));
        if (p.metric) out.push(color(`>> ${p.metric}`, 'yellow', true));
        if (p.repoUrl) {
          // Only vetted URLs become OSC-8 links; anything else is inert, control-free text.
          const c = classifyUrl(p.repoUrl);
          out.push(c.kind === 'reject' ? stripControl(p.repoUrl) : link(p.repoUrl, p.repoUrl));
        }
        return out;
      }
      case 'post': {
        const post = await ctx.data.post(ref.slug, ctx.signal);
        if (!post) return [`cat: ${noSuchFile(ctx, raw)}`];
        return [
          bold(pick(post.title, ctx.lang)),
          color(post.publishedAt.slice(0, 10), 'yellow', true),
          pick(post.excerpt, ctx.lang),
          fmt(ctx.t.shell.openToRead, { path }),
        ];
      }
    }
  },
};
export default cat;
