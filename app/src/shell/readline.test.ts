import { createReadline } from './readline';
import { stripAnsi } from './ansi';

function setup(over: Partial<Parameters<typeof createReadline>[0]> = {}) {
  const writes: string[] = [];
  const lines: string[] = [];
  const history: string[] = [];
  const rl = createReadline({
    port: { write: (d) => writes.push(d), cols: 80 },
    prompt: () => '$ ',
    onLine: async (l) => { lines.push(l); return [`ran ${l}`]; },
    complete: async (line) => (line.startsWith('c') ? { replaceFrom: 0, options: ['cat', 'cd'] } : { replaceFrom: 0, options: [] }),
    onClear: vi.fn(),
    history,
    spinner: false,
    ...over,
  });
  rl.showPrompt();
  const screen = () => { const all = writes.join(''); return stripAnsi(all.slice(all.lastIndexOf('\x1b[2K') + 4)).split('\r\n')[0]; };
  return { rl, writes, lines, history, screen };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

it('types and runs a line', async () => {
  const s = setup(); s.rl.feed('ls'); s.rl.feed('\r'); await flush();
  expect(s.lines).toEqual(['ls']);
  expect(s.writes.join('')).toContain('ran ls');
  expect(s.history).toEqual(['ls']);
});
it('paste with newlines does not run multiple commands', async () => {
  const s = setup(); s.rl.feed('ls\ncat x\r\n'); await flush();
  expect(s.lines).toEqual([]);
  expect(s.screen()).toBe('$ ls cat x ');
});
it('edits in the middle with arrows and backspace', () => {
  const s = setup(); s.rl.feed('lxs'); s.rl.feed('\x1b[D'); s.rl.feed('\x7f');
  expect(s.screen()).toBe('$ ls');
});
it('history up/down keeps the draft', async () => {
  const s = setup(); s.rl.feed('ls\r'); await flush();
  s.rl.feed('ca'); s.rl.feed('\x1b[A'); expect(s.screen()).toBe('$ ls');
  s.rl.feed('\x1b[B'); expect(s.screen()).toBe('$ ca');
});
it('tab completes the common prefix then lists on second tab', async () => {
  const s = setup(); s.rl.feed('c'); s.rl.feed('\t'); await flush();
  expect(s.screen()).toBe('$ c');
  s.rl.feed('\t'); await flush();
  expect(s.writes.join('')).toMatch(/cat\s+cd/);
});
it('ctrl+c clears an idle line', () => {
  const s = setup(); s.rl.feed('abc'); s.rl.feed('\x03');
  expect(s.writes.join('')).toContain('^C');
  expect(s.screen()).toBe('$ ');
});
it('ctrl+c aborts a running command', async () => {
  let seen: AbortSignal | undefined;
  const s = setup({ onLine: (_l, sig) => { seen = sig; return new Promise((res) => sig.addEventListener('abort', () => res(['^C']))); } });
  s.rl.feed('ls\r'); s.rl.feed('\x03'); await flush();
  expect(seen?.aborted).toBe(true);
  expect(s.rl.busy).toBe(false);
});
it('ignores typing while busy', async () => {
  let release!: () => void;
  const s = setup({ onLine: () => new Promise((res) => { release = () => res([]); }) });
  s.rl.feed('ls\r'); s.rl.feed('zzz'); release(); await flush();
  expect(s.screen()).toBe('$ ');
});
it('ctrl+l calls onClear', () => {
  const onClear = vi.fn(); const s = setup({ onClear }); s.rl.feed('\x0c');
  expect(onClear).toHaveBeenCalled();
});
it('dedupes and caps history', async () => {
  const s = setup(); for (let i = 0; i < 105; i++) { s.rl.feed(`echo ${i}\r`); await flush(); }
  s.rl.feed('echo 104\r'); await flush();
  expect(s.history).toHaveLength(100);
  expect(s.history.at(-1)).toBe('echo 104');
});
it('a lone CR runs the line; a CRLF-terminated chunk is a paste and does not', async () => {
  const s = setup(); s.rl.feed('ls'); s.rl.feed('\r'); await flush();
  expect(s.lines).toEqual(['ls']);
  s.rl.feed('pwd\r\n'); await flush();
  expect(s.lines).toEqual(['ls']);
  expect(s.screen()).toBe('$ pwd ');
});
it('spinner timers are cleared on completion, abort and dispose', async () => {
  vi.useFakeTimers();
  try {
    let release!: () => void;
    const s = setup({ spinner: true, onLine: () => new Promise((res) => { release = () => res([]); }) });
    s.rl.feed('ls\r');
    await vi.advanceTimersByTimeAsync(400);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    release(); await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);

    const a = setup({ spinner: true, onLine: (_l, sig) => new Promise((res) => sig.addEventListener('abort', () => res([]))) });
    a.rl.feed('ls\r'); await vi.advanceTimersByTimeAsync(400);
    a.rl.feed('\x03'); await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);

    const d = setup({ spinner: true, onLine: () => new Promise(() => {}) });
    d.rl.feed('ls\r'); await vi.advanceTimersByTimeAsync(400);
    d.rl.dispose();
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});
it('exposes the current line', async () => {
  const s = setup();
  expect(s.rl.line).toBe('');
  s.rl.feed('ls');
  expect(s.rl.line).toBe('ls');
  s.rl.feed('\r'); await flush();
  expect(s.rl.line).toBe('');
});
