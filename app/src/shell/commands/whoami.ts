import { link } from '../ansi';
import type { Command } from '../types';

const whoami: Command = {
  name: 'whoami',
  summary: (t) => t.shell.help.whoami,
  run(_args, ctx) {
    return ['guest', ctx.t.hero.tagline, link('https://github.com/prommin01st-lang', 'github.com/prommin01st-lang')];
  },
};
export default whoami;
