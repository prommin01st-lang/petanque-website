import type { ITheme } from '@xterm/xterm';
import { tango, type TangoName } from '@/components/asciiImage';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const NAMES: TangoName[] = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

export function xtermTheme(): ITheme {
  const th: Record<string, string> = {
    foreground: tango('white').normal,
    background: '#00000000',
    cursor: tango('green').bright,
    cursorAccent: '#0C0C0C',
    selectionBackground: tango('blue').normal,
  };
  for (const n of NAMES) {
    th[n] = tango(n).normal;
    th[`bright${cap(n)}`] = tango(n).bright;
  }
  return th as ITheme;
}
