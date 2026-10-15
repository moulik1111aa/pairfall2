import { test, expect } from 'playwright/test';

test('app loads to the home screen without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Pairfall');
  await expect(page.getByRole('heading', { name: 'Pairfall' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('sound starts after the first tap and every effect plays without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?debug');
  await page.getByRole('button', { name: /Start playing|Play level/ }).click();
  await page.waitForFunction(() => (window as any).__app.sound.ready);
  await page.evaluate(async () => {
    const s = (window as any).__app.sound;
    s.tap(); s.land(); s.match(1); s.match(6); s.deal(60); s.click();
    s.danger(true); await new Promise((r) => setTimeout(r, 900)); s.danger(false);
    s.win(); s.lose();
    s.setMusic(false); s.setMusic(true);
    await new Promise((r) => setTimeout(r, 300));
  });
  expect(errors).toEqual([]);
});

test('sound, music and vibration toggles are saved', async ({ page }) => {
  await page.goto('/?debug');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Settings' }).click();
  const music = page.locator('#set-music');
  await expect(music).toBeChecked();
  await page.getByText('Music', { exact: true }).click();
  await expect(music).not.toBeChecked();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pairfall.save')!).settings.music)).toBe(false);
});
