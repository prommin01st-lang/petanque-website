import type { Command } from '../types';

const exit: Command = {
  name: 'exit',
  summary: (t) => t.shell.help.exit,
  run(_args, ctx) {
    ctx.close();
    return [];
  },
};
export default exit;
