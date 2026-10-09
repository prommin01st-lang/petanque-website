import { defineConfig, devices } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8090;
const BASE_URL = `http://localhost:${PORT}`;

// Fresh SQLite database + uploads per run. Set once in the main process so
// workers (which re-evaluate this file) inherit the same value.
process.env.E2E_DATA_DIR ??= join(here, '.data', `run-${Date.now()}`);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    // Keeps tests off the WebGL background (the app shows StaticAsciiBackdrop);
    // the background smoke test opts back in.
    // (`reducedMotion` is a context option, not a top-level `use` fixture.)
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/build.mjs && exec ./.data/server',
    cwd: here,
    url: `${BASE_URL}/healthz`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      ADDR: `:${PORT}`,
      PUBLIC_URL: BASE_URL,
      DATA_DIR: process.env.E2E_DATA_DIR,
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'e2e-password-123',
      SESSION_SECRET: 'x'.repeat(48),
      TOTP_ENC_KEY: Buffer.alloc(32, 7).toString('base64'),
      COOKIE_SECURE: 'false',
      TRUSTED_PROXY_CIDR: '127.0.0.1/32',
    },
  },
});
