import { color } from '../ansi';
import { normalize, resolve } from '../fs';
import type { Command } from '../types';
import { noSuchFile } from './util';

const ls: Command = {
  name: 'ls',
  summary: (t) => t.shell.help.ls,
  async run(args, ctx) {
    const raw = args[0];
    const path = normalize(raw ?? '.', ctx.cwd);
    const node = await resolve(path, ctx.data, ctx.signal);
    if (!node) return [`ls: ${noSuchFile(ctx, raw ?? path)}`];
    if (node.kind === 'file') return [node.name];
    const children = await node.children();
    const flagship =
      path === '~/projects'
        ? new Set((await ctx.data.projects(ctx.signal)).filter((p) => p.flagship).map((p) => p.slug))
        : new Set<string>();
    const names = children.map((c) => {
      if (c.kind === 'dir') return color(`${c.name}/`, 'blue', true);
      return flagship.has(c.name) ? `${c.name} ${color('[★]', 'yellow', true)}` : c.name;
    });
    return [names.join('  ')];
  },
};
export default ls;
