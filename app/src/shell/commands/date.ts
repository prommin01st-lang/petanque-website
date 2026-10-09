import type { Command } from '../types';

const date: Command = {
  name: 'date',
  summary: (t) => t.shell.help.date,
  run: () => [new Date().toString()],
};
export default date;
