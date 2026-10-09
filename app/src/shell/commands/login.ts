import type { Command, ShellContext } from '../types';
import { fmt, usage } from './util';

/* ------------------------------------------------------------------ */
/*  Hidden easter-egg commands that take the owner to the admin login  */
/* ------------------------------------------------------------------ */

const ADMIN_LOGIN = '/admin/login';
const HOSTS = new Set(['petanque21st', 'admin@petanque21st', 'petanque21st.com', 'admin@petanque21st.com']);

function openLogin(ctx: ShellContext): string[] {
  if (ctx.signal.aborted) return [];
  ctx.navigate(ADMIN_LOGIN);
  ctx.close();
  return [fmt(ctx.t.shell.opening, { path: ADMIN_LOGIN })];
}

export const login: Command = {
  name: 'login',
  hidden: true,
  summary: (t) => t.shell.help.login,
  run: (_args, ctx) => openLogin(ctx),
};

export const sudo: Command = {
  name: 'sudo',
  hidden: true,
  summary: (t) => t.shell.help.login,
  run(args, ctx) {
    if (args.length === 1 && args[0] === 'su') return openLogin(ctx);
    return [fmt(ctx.t.shell.sudoDenied, { user: 'guest' })];
  },
};

export const ssh: Command = {
  name: 'ssh',
  hidden: true,
  summary: (t) => t.shell.help.login,
  run(args, ctx) {
    const target = args[0];
    if (!target) return [usage(ctx, 'ssh admin@petanque21st')];
    if (HOSTS.has(target.toLowerCase())) return openLogin(ctx);
    const host = target.includes('@') ? target.slice(target.lastIndexOf('@') + 1) : target;
    return [fmt(ctx.t.shell.sshRefused, { host })];
  },
};
