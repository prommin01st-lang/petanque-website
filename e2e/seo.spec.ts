import { expect, test } from '@playwright/test';

test('identity metadata and the portrait are available to crawlers and visitors', async ({ page, request }) => {
  const response = await request.get('/?utm_source=seo-check');
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).toContain('<title>Prommin Chandet (Petanque) — Full-Stack Web Developer</title>');
  expect(html).toContain('พรหมมินทร์ จันทร์เดช');
  expect(html).toContain('<link rel="canonical" href="http://localhost:8090/">');
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
  const person = data['@graph'].find((entity: { '@type': string }) => entity['@type'] === 'Person');
  expect(person.name).toBe('Prommin Chandet');
  const image = await request.get(person.image);
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toBe('image/png');
  expect((await image.body()).length).toBeGreaterThan(0);
  const oldImage = await request.get('/profile.png', { maxRedirects: 0 });
  expect(oldImage.status()).toBe(301);
  expect(oldImage.headers().location).toBe('/prommin-chandet-petanque.png');

  const robots = await request.get('/robots.txt');
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(await robots.text()).toContain('Sitemap: http://localhost:8090/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain(`<image:loc>${person.image}</image:loc>`);

  await page.goto('/');
  await expect(page).toHaveTitle('Prommin Chandet (Petanque) — Full-Stack Web Developer');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prommin Chandet');
  const portrait = page.getByAltText('Pixel-art portrait of Prommin Chandet (Petanque)');
  await expect(portrait).toHaveAttribute('src', '/prommin-chandet-petanque.png');
  await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(960);
});

test('the Thai introduction fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'TH', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('พรหมมินทร์ จันทร์เดช');
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.getByText('Prommin Chandet · Petanque', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
