import type { Command } from '../types';
import { fmt, usage } from './util';

const lang: Command = {
  name: 'lang',
  summary: (t) => t.shell.help.lang,
  run(args, ctx) {
    const l = args[0];
    if (l !== 'en' && l !== 'th') return [usage(ctx, 'lang en|th')];
    ctx.setLang(l);
    return [fmt(ctx.t.shell.langSet, { lang: l })];
  },
};
export default lang;
