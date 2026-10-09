// Builds the SPA, embeds it into the Go server and compiles the server binary
// to e2e/.data/server. Run by the Playwright webServer command (Playwright
// starts webServer BEFORE globalSetup, so the build cannot live there).
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const e2e = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(e2e, '..');
const appDir = join(root, 'app');
const serverDir = join(root, 'server');
const distDir = join(serverDir, 'internal', 'web', 'dist');
const out = join(e2e, '.data', 'server');

const run = (cmd, args, cwd, env = process.env) => execFileSync(cmd, args, { cwd, env, stdio: ['ignore', 2, 2] });

if (process.env.E2E_SKIP_BUILD !== '1') {
  run('npm', ['run', 'build'], appDir);

  // Replace the embedded dist (gitignored except .keep).
  for (const name of readdirSync(distDir)) {
    if (name !== '.keep') rmSync(join(distDir, name), { recursive: true, force: true });
  }
  cpSync(join(appDir, 'dist'), distDir, { recursive: true });

  mkdirSync(dirname(out), { recursive: true });
  run('go', ['build', '-o', out, './cmd/server'], serverDir, { ...process.env, CGO_ENABLED: '0' });
}
