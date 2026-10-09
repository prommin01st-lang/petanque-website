import { color } from '../ansi';
import { normalize, resolve } from '../fs';
import type { Node } from '../fs';
import type { Command } from '../types';
import { noSuchFile } from './util';

const MAX_DEPTH = 2;

async function walk(
  node: Node,
  prefix: string,
  depth: number,
  lines: string[],
  count: { dirs: number; files: number },
): Promise<void> {
  if (node.kind !== 'dir' || depth >= MAX_DEPTH) return;
  const children = await node.children();
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    const last = i === children.length - 1;
    const isDir = c.kind === 'dir';
    if (isDir) count.dirs++;
    else count.files++;
    lines.push(prefix + (last ? '└── ' : '├── ') + (isDir ? color(`${c.name}/`, 'blue', true) : c.name));
    await walk(c, prefix + (last ? '    ' : '│   '), depth + 1, lines, count);
  }
}

const tree: Command = {
  name: 'tree',
  summary: (t) => t.shell.help.tree,
  async run(args, ctx) {
    const raw = args[0];
    const path = normalize(raw ?? '.', ctx.cwd);
    const node = await resolve(path, ctx.data, ctx.signal);
    if (!node) return [`tree: ${noSuchFile(ctx, raw ?? path)}`];
    const lines = [color(path, 'blue', true)];
    const count = { dirs: 0, files: 0 };
    await walk(node, '', 0, lines, count);
    lines.push('', `${count.dirs} directories, ${count.files} files`);
    return lines;
  },
};
export default tree;
