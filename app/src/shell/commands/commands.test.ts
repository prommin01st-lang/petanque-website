import { describe, expect, it, vi } from 'vitest';
import { run } from './index';
import openCmd from './open';
import cdCmd from './cd';
import { makeTestCtx } from '../testCtx';
import { stripAnsi } from '../ansi';

const plain = (lines: string[]) => lines.map(stripAnsi);

describe('shell commands', () => {
  it('unknown command suggests the closest', async () => {
    expect(plain(await run('lss', makeTestCtx()))).toEqual(['bash: lss: command not found', "did you mean 'ls'?"]);
  });
  it('empty line prints nothing', async () => {
    expect(await run('   ', makeTestCtx())).toEqual([]);
  });
  it('ls ~ lists home with dirs coloured', async () => {
    expect(plain(await run('ls', makeTestCtx()))).toEqual(['about.md  skills/  projects/  blog/']);
  });
  it('ls projects marks flagship', async () => {
    expect(plain(await run('ls projects', makeTestCtx()))[0]).toContain('kanban [★]');
  });
  it('cat a project shows tags and repo link', async () => {
    const out = await run('cat ~/projects/kanban', makeTestCtx());
    expect(out.join('\n')).toContain('\x1b]8;;https://github.com/x/kanban');
  });
  it('cat a skill prints display name and category', async () => {
    expect(plain(await run('cat ~/skills/cloud-integrations/google-oauth-calendar', makeTestCtx()))).toEqual([
      'Google OAuth/Calendar (cloud-integrations)',
    ]);
  });
  it('cat a post shows the hint', async () => {
    const out = plain(await run('cat blog/hello', makeTestCtx()));
    expect(out).toContain('2026-01-02');
    expect(out.at(-1)).toBe("run 'open ~/blog/hello' to read it");
  });
  it('cat missing file', async () => {
    expect(plain(await run('cat ~/projects/nope', makeTestCtx()))).toEqual(['cat: ~/projects/nope: No such file or directory']);
  });
  it('cat a directory', async () => {
    expect(plain(await run('cat projects', makeTestCtx()))).toEqual(['cat: projects: Is a directory']);
  });
  it('cd section scrolls and sets cwd', async () => {
    const ctx = makeTestCtx();
    await run('cd skills', ctx);
    expect(ctx.calls.goSection).toEqual([['skills']]);
    expect(ctx.calls.setCwd).toEqual([['~/skills']]);
  });
  it('cd home maps to hero', async () => {
    const ctx = makeTestCtx();
    await run('cd', ctx);
    expect(ctx.calls.goSection).toEqual([['hero']]);
  });
  it('cd into a file errors', async () => {
    expect(plain(await run('cd ~/projects/kanban', makeTestCtx()))).toEqual(['cd: ~/projects/kanban: Not a directory']);
  });
  it('cd to a missing dir errors, no navigation', async () => {
    const ctx = makeTestCtx();
    expect(plain(await run('cd nowhere', ctx))).toEqual(['cd: nowhere: No such file or directory']);
    expect(ctx.calls.goSection ?? []).toEqual([]);
  });
  it('open post navigates and closes', async () => {
    const ctx = makeTestCtx();
    await run('open hello', ctx);
    expect(ctx.calls.navigate).toEqual([['/blog/hello']]);
    expect(ctx.calls.close).toHaveLength(1);
  });
  it('open project with repo opens externally', async () => {
    const ctx = makeTestCtx();
    await run('open kanban', ctx);
    expect(ctx.calls.openExternal).toEqual([['https://github.com/x/kanban']]);
  });
  it('open project without repo falls back to the card', async () => {
    const ctx = makeTestCtx();
    await run('open docs', ctx);
    expect(ctx.calls.goSection).toEqual([['projects']]);
  });
  it('open url opens externally', async () => {
    const ctx = makeTestCtx();
    await run('open https://example.com', ctx);
    expect(ctx.calls.openExternal).toEqual([['https://example.com/']]); // normalized href from classifyUrl
  });
  it('open project with an unsafe repoUrl never opens it and falls back to the card', async () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.com']) {
      const ctx = makeTestCtx();
      const projects = await ctx.data.projects();
      (ctx.data.projects as ReturnType<typeof vi.fn>).mockResolvedValue(
        projects.map((p) => (p.slug === 'kanban' ? { ...p, repoUrl: bad } : p)),
      );
      const out = plain(await run('open kanban', ctx));
      expect(ctx.calls.openExternal ?? []).toEqual([]);
      expect(ctx.calls.goSection).toEqual([['projects']]);
      expect(out).toEqual(['~/projects/kanban: no public repository — showing the card']);
    }
  });
  it('open with a non-http url argument is rejected', async () => {
    const ctx = makeTestCtx();
    await run('open javascript:alert(1)', ctx);
    expect(ctx.calls.openExternal ?? []).toEqual([]);
  });
  it('cat prints an unsafe repoUrl as plain text without OSC-8 or control chars', async () => {
    const ctx = makeTestCtx();
    const projects = await ctx.data.projects();
    (ctx.data.projects as ReturnType<typeof vi.fn>).mockResolvedValue(
      projects.map((p) => (p.slug === 'kanban' ? { ...p, repoUrl: 'javascript:alert(1)\x07\x1b]8;;https://ok\x07' } : p)),
    );
    const out = await run('cat ~/projects/kanban', ctx);
    const last = out.at(-1)!;
    expect(last).not.toContain('\x1b]8;;');
    // eslint-disable-next-line no-control-regex
    expect(last).not.toMatch(/[\x00-\x1f\x7f]/);
    expect(last).toBe('javascript:alert(1)]8;;https://ok');
  });
  it('cat prints a safe repoUrl as an OSC-8 link', async () => {
    const out = await run('cat ~/projects/kanban', makeTestCtx());
    expect(out.at(-1)).toBe('\x1b]8;;https://github.com/x/kanban\x07https://github.com/x/kanban\x1b]8;;\x07');
  });
  it('network failure prints the error line', async () => {
    const ctx = makeTestCtx();
    (ctx.data.projects as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('x'));
    expect(plain(await run('ls projects', ctx))).toEqual(['error: network unreachable (try again)']);
  });
  it('abort prints ^C', async () => {
    const ac = new AbortController();
    const ctx = makeTestCtx({ signal: ac.signal });
    (ctx.data.projects as ReturnType<typeof vi.fn>).mockImplementation(
      (s?: AbortSignal) =>
        new Promise((_, rej) => s?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))),
    );
    const p = run('ls projects', ctx);
    ac.abort();
    expect(await p).toEqual(['^C']);
  });
  it('lang switches', async () => {
    const ctx = makeTestCtx();
    await run('lang th', ctx);
    expect(ctx.calls.setLang).toEqual([['th']]);
  });
  it('lang with bad arg prints usage', async () => {
    expect(plain(await run('lang fr', makeTestCtx()))).toEqual(['usage: lang en|th']);
  });
  it('help lists every command', async () => {
    const out = plain(await run('help', makeTestCtx())).join('\n');
    for (const n of ['help', 'ls', 'cat', 'tree', 'whoami', 'cd', 'open', 'exit']) expect(out).toContain(n);
  });
  it('tree skills summarises', async () => {
    expect(plain(await run('tree ~/skills', makeTestCtx())).at(-1)).toMatch(/^6 directories, \d+ files$/);
  });
  it('echo, history, clear, exit, whoami', async () => {
    const ctx = makeTestCtx({ history: ['ls', 'help'] });
    expect(await run('echo a   "b c"', ctx)).toEqual(['a b c']);
    expect(plain(await run('history', ctx))).toEqual(['  1  ls', '  2  help']);
    expect(await run('clear', ctx)).toEqual([]);
    expect(ctx.calls.clear).toHaveLength(1);
    expect(await run('exit', ctx)).toEqual([]);
    expect(ctx.calls.close).toHaveLength(1);
    expect(plain(await run('whoami', ctx))[0]).toBe('guest');
  });
  it('help works when ./help is loaded before ./index', async () => {
    vi.resetModules();
    await import('./help');
    const { run: freshRun } = await import('./index');
    const out = (await freshRun('help', makeTestCtx())).map(stripAnsi).join('\n');
    expect(out).toContain('whoami');
  });
  it('open and cd perform no side effects after abort', async () => {
    const ac = new AbortController();
    const ctx = makeTestCtx({ signal: ac.signal });
    ac.abort();
    expect(await openCmd.run(['blog/hello'], ctx)).toEqual([]);
    expect(await cdCmd.run(['~/projects/kanban'], ctx)).toEqual([]);
    expect(ctx.calls.navigate).toBeUndefined();
    expect(ctx.calls.close).toBeUndefined();
    expect(ctx.calls.setCwd).toBeUndefined();
  });
});
