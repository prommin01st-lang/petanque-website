export interface Parsed { cmd: string; args: string[] }

export function parse(line: string): Parsed | null {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  let has = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === '\\' && i + 1 < line.length) {
      cur += line[++i];
      has = true;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      has = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (has || cur) {
        out.push(cur);
        cur = '';
        has = false;
      }
      continue;
    }
    cur += c;
    has = true;
  }
  if (has || cur) out.push(cur);
  if (out.length === 0) return null;
  return { cmd: out[0].toLowerCase(), args: out.slice(1) };
}
