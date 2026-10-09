import type { Command } from '../types';

const clear: Command = {
  name: 'clear',
  summary: (t) => t.shell.help.clear,
  run(_args, ctx) {
    ctx.clear();
    return [];
  },
};
export default clear;
