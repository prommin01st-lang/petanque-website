import { parse } from '../parse';
import { suggest } from '../suggest';
import { color } from '../ansi';
import type { Command, ShellContext, ShellOutput } from '../types';
import makeHelp from './help';
import ls from './ls';
import cat from './cat';
import tree from './tree';
import whoami from './whoami';
import echo from './echo';
import date from './date';
import history from './history';
import clear from './clear';
import lang from './lang';
import cd from './cd';
import open from './open';
import exit from './exit';
import { fmt } from './util';

const help = makeHelp(() => COMMANDS);

export const COMMANDS: readonly Command[] = [help, ls, cat, tree, whoami, echo, date, history, clear, lang, cd, open, exit];
export const COMMAND_NAMES: readonly string[] = COMMANDS.map((c) => c.name);

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

// Rejects as soon as the signal aborts, even if the command never observes it.
function whenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const abort = () => reject(new DOMException('aborted', 'AbortError'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export async function run(line: string, ctx: ShellContext): Promise<ShellOutput> {
  const p = parse(line);
  if (!p) return [];
  const cmd = COMMANDS.find((c) => c.name === p.cmd);
  if (!cmd) {
    const s = suggest(p.cmd, COMMAND_NAMES);
    return [`bash: ${p.cmd}: ${ctx.t.shell.notFound}`, ...(s ? [fmt(ctx.t.shell.didYouMean, { cmd: s })] : [])];
  }
  try {
    return await Promise.race([Promise.resolve(cmd.run(p.args, ctx)), whenAborted(ctx.signal)]);
  } catch (e) {
    if (isAbort(e) || ctx.signal.aborted) return ['^C'];
    return [color(ctx.t.shell.networkError, 'red', true)];
  }
}
