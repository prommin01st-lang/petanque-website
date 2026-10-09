import type { ShellContext } from '../types';

export const fmt = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);

export const usage = (ctx: ShellContext, cmd: string) => fmt(ctx.t.shell.usage, { cmd });
export const noSuchFile = (ctx: ShellContext, path: string) => fmt(ctx.t.shell.noSuchFile, { path });
export const notADir = (ctx: ShellContext, path: string) => fmt(ctx.t.shell.notADir, { path });
export const isADir = (ctx: ShellContext, path: string) => fmt(ctx.t.shell.isADir, { path });
