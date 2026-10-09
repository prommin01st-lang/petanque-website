import { describe, expect, it } from 'vitest';
import { run, COMMAND_NAMES } from './index';
import { makeTestCtx } from '../testCtx';
import { stripAnsi } from '../ansi';

const plain = (lines: string[]) => lines.map(stripAnsi);

describe('hidden admin login commands', () => {
  it.each(['login', 'sudo su', 'ssh admin@petanque21st', 'ssh petanque21st', 'SSH admin@petanque21st', 'ssh admin@petanque21st.com'])('%s opens the admin login', async (line) => {
    const ctx = makeTestCtx();
    expect(plain(await run(line, ctx))).toEqual(['opening /admin/login…']);
    expect(ctx.calls.navigate).toEqual([['/admin/login']]);
    expect(ctx.calls.close).toHaveLength(1);
  });

  it('sudo with anything else is refused', async () => {
    const ctx = makeTestCtx();
    expect(plain(await run('sudo rm -rf /', ctx))).toEqual(['guest is not in the sudoers file. This incident will be reported.']);
    expect(ctx.calls.navigate ?? []).toEqual([]);
  });

  it('ssh to another host is refused', async () => {
    const ctx = makeTestCtx();
    expect(plain(await run('ssh root@example.com', ctx))).toEqual(['ssh: connect to host example.com port 22: Connection refused']);
    expect(ctx.calls.navigate ?? []).toEqual([]);
  });

  it('bare ssh prints usage', async () => {
    expect(plain(await run('ssh', makeTestCtx()))).toEqual(['usage: ssh admin@petanque21st']);
  });

  it('is hidden from help, completion and suggestions', async () => {
    const help = plain(await run('help', makeTestCtx())).join('\n');
    for (const name of ['login', 'sudo', 'ssh']) {
      expect(help).not.toMatch(new RegExp(`^${name}\\b`, 'm'));
      expect(COMMAND_NAMES).not.toContain(name);
    }
    expect(plain(await run('logi', makeTestCtx())).join('\n')).not.toContain("'login'");
  });

  it('does not navigate after Ctrl+C', async () => {
    const ac = new AbortController();
    ac.abort();
    const ctx = makeTestCtx({ signal: ac.signal });
    await run('login', ctx);
    expect(ctx.calls.navigate ?? []).toEqual([]);
  });
});
