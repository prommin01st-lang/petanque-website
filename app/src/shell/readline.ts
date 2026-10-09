import { visibleWidth } from './ansi';

export interface TermPort { write(data: string): void; readonly cols: number }
export interface ReadlineOptions {
  port: TermPort;
  prompt: () => string;
  onLine: (line: string, signal: AbortSignal) => Promise<string[]>;
  complete: (line: string, cursor: number) => Promise<{ replaceFrom: number; options: string[] }>;
  onClear: () => void;
  history: string[];
  spinner?: boolean;
}
export interface Readline { feed(data: string): void; showPrompt(): void; readonly busy: boolean; readonly line: string; dispose(): void }

const FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
const HISTORY_CAP = 100;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/g;

function commonPrefix(items: string[]): string {
  let p = items[0] ?? '';
  for (const s of items) while (!s.startsWith(p)) p = p.slice(0, -1);
  return p;
}

export function createReadline(o: ReadlineOptions): Readline {
  const { port, history } = o;
  let line = '';
  let cursor = 0;
  let histIdx = history.length;
  let draft = '';
  let busy = false;
  let disposed = false;
  let controller: AbortController | null = null;
  let lastWasTab = false;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let spinTimer: ReturnType<typeof setInterval> | undefined;
  let spinShown = false;

  const redraw = () => {
    port.write(`\r\x1b[2K${o.prompt()}${line}`);
    const back = visibleWidth(line.slice(cursor));
    if (back > 0) port.write(`\x1b[${back}D`);
  };
  const setLine = (s: string, at = s.length) => { line = s; cursor = at; redraw(); };
  const insert = (s: string) => setLine(line.slice(0, cursor) + s + line.slice(cursor), cursor + s.length);

  const stopSpinner = () => {
    clearTimeout(startTimer); clearInterval(spinTimer);
    startTimer = spinTimer = undefined;
    if (spinShown) { port.write('\b \b'); spinShown = false; }
  };
  const startSpinner = () => {
    startTimer = setTimeout(() => {
      if (o.spinner === false) { port.write('…'); spinShown = true; return; }
      let i = 0;
      port.write(FRAMES[i]); spinShown = true;
      spinTimer = setInterval(() => { i = (i + 1) % FRAMES.length; port.write(`\b${FRAMES[i]}`); }, 80);
    }, 150);
  };

  const run = async (text: string) => {
    port.write('\r\n');
    if (text.trim() && history[history.length - 1] !== text) {
      history.push(text);
      if (history.length > HISTORY_CAP) history.splice(0, history.length - HISTORY_CAP);
    }
    line = ''; cursor = 0; histIdx = history.length; draft = '';
    busy = true;
    controller = new AbortController();
    startSpinner();
    let out: string[] = [];
    try { out = await o.onLine(text, controller.signal); } catch { out = []; }
    stopSpinner();
    controller = null;
    busy = false;
    if (disposed) return;
    for (const l of out) port.write(`${l}\r\n`);
    redraw();
  };

  const listOptions = (options: string[]) => {
    const w = Math.max(...options.map(visibleWidth)) + 2;
    const per = Math.max(1, Math.floor(port.cols / w));
    let out = '\r\n';
    options.forEach((opt, i) => {
      out += opt + ' '.repeat(w - visibleWidth(opt));
      if ((i + 1) % per === 0 || i === options.length - 1) out = out.trimEnd() + '\r\n';
    });
    port.write(out);
    redraw();
  };

  const tab = async (second: boolean) => {
    const snapshot = line; const at = cursor;
    const { replaceFrom, options } = await o.complete(snapshot, at);
    if (disposed || line !== snapshot || cursor !== at || options.length === 0) return;
    const word = snapshot.slice(replaceFrom, at);
    const replace = (s: string) => setLine(snapshot.slice(0, replaceFrom) + s + snapshot.slice(at), replaceFrom + s.length);
    if (options.length === 1) { replace(options[0] + (options[0].endsWith('/') ? '' : ' ')); return; }
    const prefix = commonPrefix(options);
    if (prefix.length > word.length) replace(prefix);
    else if (second) listOptions(options);
  };

  const history1 = (dir: -1 | 1) => {
    if (dir < 0 && histIdx > 0) {
      if (histIdx === history.length) draft = line;
      histIdx--; setLine(history[histIdx]);
    } else if (dir > 0 && histIdx < history.length) {
      histIdx++; setLine(histIdx === history.length ? draft : history[histIdx]);
    }
  };

  const feed = (data: string) => {
    if (disposed) return;
    if (busy) { if (data.includes('\x03')) controller?.abort(); return; }
    const wasTab = lastWasTab;
    lastWasTab = false;
    switch (data) {
      case '\r': void run(line); return;
      case '\x7f': if (cursor > 0) setLine(line.slice(0, cursor - 1) + line.slice(cursor), cursor - 1); return;
      case '\x1b[3~': if (cursor < line.length) setLine(line.slice(0, cursor) + line.slice(cursor + 1), cursor); return;
      case '\x1b[D': if (cursor > 0) { cursor--; redraw(); } return;
      case '\x1b[C': if (cursor < line.length) { cursor++; redraw(); } return;
      case '\x1b[H': case '\x1bOH': case '\x01': cursor = 0; redraw(); return;
      case '\x1b[F': case '\x1bOF': case '\x05': cursor = line.length; redraw(); return;
      case '\x1b[A': history1(-1); return;
      case '\x1b[B': history1(1); return;
      case '\x15': setLine(''); return;
      case '\t': lastWasTab = true; void tab(wasTab); return;
      case '\x03': port.write('^C\r\n'); line = ''; cursor = 0; histIdx = history.length; redraw(); return;
      case '\x0c': o.onClear(); redraw(); return;
    }
    if (data.startsWith('\x1b')) return; // unknown escape sequence
    // A chunk ending in a single CR (and containing no other line break) is typing + Enter.
    // Anything else with line breaks is a paste: flattened to one line, never run.
    const enter = /^[^\r\n]*\r$/.test(data);
    const text = (enter ? data.slice(0, -1) : data).replace(/\r\n|\n|\r/g, ' ').replace(CONTROL, '');
    if (text) insert(text);
    if (enter) void run(line);
  };

  return {
    feed,
    showPrompt: () => redraw(),
    get busy() { return busy; },
    get line() { return line; },
    dispose() { disposed = true; controller?.abort(); stopSpinner(); },
  };
}
