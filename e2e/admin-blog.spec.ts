import { expect, test } from '@playwright/test';
import * as OTPAuth from 'otpauth';

const ADMIN = { username: 'admin', password: 'e2e-password-123' };
const TITLE = 'E2E Hello World';

test('admin sets up TOTP, publishes a post, and it appears on /blog', async ({ page }) => {
  // Step 1: password.
  await page.goto('/admin/login');
  await page.getByLabel('Username').fill(ADMIN.username);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Step 2: first login enrols TOTP.
  const secretText = await page.getByTestId('totp-secret').innerText();
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretText.replace(/\s/g, '')) });
  await page.getByLabel('Code').fill(totp.generate());
  await page.getByRole('button', { name: 'Verify' }).click();

  // Step 3: recovery codes; the checkbox gates [continue].
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I saved these codes' }).check();
  await cont.click();
  await expect(page).toHaveURL(/\/admin\/projects$/);

  // Step 4: write and publish a post.
  await page.goto('/admin/posts/new');
  await page.getByLabel('title', { exact: true }).fill(TITLE);
  await expect(page.getByLabel('slug', { exact: true })).toHaveValue('e2e-hello-world');
  await page.getByLabel('body', { exact: true }).fill('## It works\n\nPublished from Playwright.');
  const published = page.getByRole('button', { name: '[published]' });
  await published.click();
  await expect(published).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '[save]' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/posts\/\d+$/);

  // Step 5: the public blog lists and renders it.
  await page.goto('/blog');
  await page.getByRole('link', { name: new RegExp(TITLE) }).click();
  await expect(page).toHaveURL(/\/blog\/e2e-hello-world$/);
  await expect(page.getByRole('heading', { name: 'It works' })).toBeVisible();
  await expect(page).toHaveTitle(`${TITLE} — Petanque21st`);

  // Server-rendered meta for crawlers (web.RenderIndex).
  const res = await page.request.get('/blog/e2e-hello-world');
  expect(res.ok()).toBe(true);
  const html = await res.text();
  expect(html).toContain(`<title>${TITLE} — Petanque21st</title>`);
  expect(html).toContain(`<meta property="og:title" content="${TITLE} — Petanque21st">`);
  expect(html).toContain('<meta property="og:type" content="article">');
  expect(html).toContain('<link rel="canonical" href="http://localhost:8090/blog/e2e-hello-world">');

  // ...and the RSS feed and sitemap carry it.
  const rss = await (await page.request.get('/rss.xml')).text();
  expect(rss).toMatch(/^<\?xml[^>]*\?>\s*<rss version="2.0">/);
  expect(rss).toContain(`<title>${TITLE}</title>`);
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toMatch(/^<\?xml[^>]*\?>\s*<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  expect(sitemap).toContain('<loc>http://localhost:8090/blog/e2e-hello-world</loc>');
});

test('seeded projects render on the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('~/projects/kanban').first()).toBeVisible();
  // Reduced motion → static ASCII backdrop, no WebGL canvas.
  await expect(page.getByTestId('static-ascii-backdrop')).toBeAttached();
  await expect(page.getByTestId('ascii-background')).toHaveCount(0);
});

test('hero ASCII portrait toggles between ASCII and photo', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'ASCII / photo' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test.describe('animated background', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('WebGL ASCII canvas mounts without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    const webgl = await page.evaluate(() => {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
    });
    test.skip(!webgl, 'WebGL unavailable in this headless browser');

    const canvas = page.getByTestId('ascii-background');
    await expect(canvas).toBeVisible();
    // Let a few frames render, then make sure it didn't fall back.
    await page.waitForTimeout(1000);
    await expect(canvas).toBeVisible();
    await expect(page.getByTestId('static-ascii-backdrop')).toHaveCount(0);
    const size = await canvas.evaluate((el: HTMLCanvasElement) => [el.width, el.height]);
    expect(size[0]).toBeGreaterThan(0);
    expect(size[1]).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});
