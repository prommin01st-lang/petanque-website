import type { TangoName } from '@/components/asciiImage';

const ORDER: TangoName[] = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const ESC = '\x1b';

export const color = (text: string, name: TangoName, bright = false) =>
  `${ESC}[${(bright ? 90 : 30) + ORDER.indexOf(name)}m${text}${ESC}[0m`;
export const bold = (text: string) => `${ESC}[1m${text}${ESC}[0m`;
export const link = (url: string, text: string) => `${ESC}]8;;${url}\x07${text}${ESC}]8;;\x07`;

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*[A-Za-z]|\x1b\]8;;[^\x07]*\x07/g;
export const stripAnsi = (s: string) => s.replace(ANSI, '');

const seg =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function visibleWidth(s: string): number {
  const plain = stripAnsi(s);
  return seg ? [...seg.segment(plain)].length : [...plain].length;
}
