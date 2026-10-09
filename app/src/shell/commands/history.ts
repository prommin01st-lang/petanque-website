import type { Command } from '../types';

const history: Command = {
  name: 'history',
  summary: (t) => t.shell.help.history,
  run: (_args, ctx) => ctx.history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`),
};
export default history;
