import { xtermTheme } from './xtermTheme';
import { tango } from '@/components/asciiImage';

it('maps the 16 ANSI slots to Tango', () => {
  const th = xtermTheme();
  expect(th.red).toBe(tango('red').normal);
  expect(th.brightRed).toBe(tango('red').bright);
  expect(th.green).toBe(tango('green').normal);
  expect(th.brightCyan).toBe(tango('cyan').bright);
  expect(th.black).toBe(tango('black').normal);
  expect(th.brightWhite).toBe(tango('white').bright);
  expect(th.foreground).toBe(tango('white').normal);
  expect(th.background).toBe('#00000000'); // transparent: TerminalWindow body shows through
});
