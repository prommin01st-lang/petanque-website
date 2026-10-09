import { normalize, resolve } from './fs';
import type { ShellData } from './types';

export interface Completion { replaceFrom: number; options: string[] }

export async function complete(
  line: string,
  cursor: number,
  commands: readonly string[],
  cwd: string,
  data: ShellData,
): Promise<Completion> {
  const before = line.slice(0, cursor);
  const start = before.lastIndexOf(' ') + 1;
  const word = before.slice(start);
  if (start === 0 || before.trimStart() === word) {
    return { replaceFrom: start, options: commands.filter((c) => c.startsWith(word.toLowerCase())).sort() };
  }
  const slash = word.lastIndexOf('/');
  const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
  const prefix = slash >= 0 ? word.slice(slash + 1) : word;
  const node = await resolve(normalize(dirPart || '.', cwd), data).catch(() => null);
  const replaceFrom = start + dirPart.length;
  if (!node || node.kind !== 'dir') return { replaceFrom, options: [] };
  const kids = await node.children().catch(() => []);
  return {
    replaceFrom,
    options: kids
      .filter((k) => k.name.startsWith(prefix))
      .map((k) => (k.kind === 'dir' ? `${k.name}/` : k.name))
      .sort(),
  };
}
