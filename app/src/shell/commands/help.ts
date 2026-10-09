import { bold } from '../ansi';
import type { Command } from '../types';

// Factory so this module does not import the registry (avoids a circular import).
export default function makeHelp(list: () => readonly Command[]): Command {
  return {
    name: 'help',
    summary: (t) => t.shell.help.help,
    run(_args, ctx) {
      return [...list().filter((c) => !c.hidden).map((c) => bold(c.name.padEnd(8)) + c.summary(ctx.t)), ctx.t.shell.hint];
    },
  };
}
