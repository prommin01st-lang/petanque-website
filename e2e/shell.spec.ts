import { expect, test } from '@playwright/test';

test('shell: list projects and jump to skills', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Backquote');
  const shell = page.locator('.xterm');
  await expect(shell).toBeVisible();
  await page.keyboard.type('ls projects');
  await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-rows')).toContainText('kanban');
  await page.keyboard.type('cd skills');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Window list' }).getByRole('button', { name: /3:skills\*/ })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.getElementById('skills')!.getBoundingClientRect().top)).toBeLessThan(200);
  await page.keyboard.press('Escape');
  await expect(shell).toBeHidden();
});

test('shell button in the status bar opens the shell', async ({ page }) => {
  await page.goto('/blog');
  await page.getByRole('navigation', { name: 'Window list' }).getByRole('button', { name: /open shell/i }).click();
  await expect(page.locator('.xterm')).toBeVisible();
});

test('shell window buttons respond to real mouse clicks', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Backquote');
  const panel = page.getByRole('dialog');
  await expect(page.locator('.xterm')).toBeVisible();
  await panel.locator('button.term-window-btn-max').click();
  await expect(panel).toHaveAttribute('data-mode', 'maximized');
  await panel.locator('button.term-window-btn-min').click();
  await expect(panel).toHaveAttribute('data-mode', 'minimized');
  await panel.locator('.term-window-title').click();
  await expect(panel).toHaveAttribute('data-mode', 'normal');
  await panel.locator('button.term-window-btn-close').click();
  await expect(page.locator('.xterm')).toBeHidden();
});
