import type { Command } from '../types';

const echo: Command = {
  name: 'echo',
  summary: (t) => t.shell.help.echo,
  run: (args) => [args.join(' ')],
};
export default echo;
