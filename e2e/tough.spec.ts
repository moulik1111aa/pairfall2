// Tougher play (2026-10-17): the edge rule, bombs, timed levels and jumping ahead.
import { test, expect, type Page } from 'playwright/test';

async function freshStart(page: Page, url = '/?debug') {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
}

async function dismissIntros(page: Page) {
  for (let i = 0; i < 30; i++) {
    if (await page.locator('.stage .tile').count()) return;
    const b = page.getByRole('button', { name: 'Got it' });
    if (await b.count()) await b.click();
    else await page.waitForTimeout(150);
  }
  await page.waitForSelector('.stage .tile');
}

test('a tile boxed in by its own layer cannot be tapped, and says why', async ({ page }) => {
  await freshStart(page, '/?debug&level=37');
  await expect(page.getByRole('dialog', { name: 'Only edge tiles' })).toBeVisible();
  await expect(page.locator('.edge-pic .tile.blocked')).toHaveCount(1);
  await dismissIntros(page);
  await page.waitForFunction(() => !!window.__pairfall);
  const boxed = await page.evaluate(() => {
    const b = window.__pairfall!.game.board;
    return b.presentSlots().find((s) => b.isUncovered(s) && !b.hasOpenSide(s));
  });
  expect(boxed).toBeDefined();
  await expect(page.locator(`.tile[data-slot="${boxed}"]`)).toHaveClass(/blocked/);
  await page.locator(`.tile[data-slot="${boxed}"]`).dispatchEvent('pointerdown');
  expect(await page.evaluate(() => window.__pairfall!.game.tray.length)).toBe(0);
  await expect(page.locator('.toast')).toContainText('Boxed in');
});

test('bomb tiles count down with every tap', async ({ page }) => {
  await freshStart(page, '/?debug&level=46');
  // skip the earlier introductions (edge rule, older special tiles) up to the bomb card
  const bombCard = page.getByRole('dialog', { name: 'Bomb tiles' });
  for (let i = 0; i < 10 && !(await bombCard.count()); i++) {
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  await expect(bombCard).toBeVisible();
  await expect(bombCard.locator('h2 .hi')).toHaveText('बम टाइलें');
  await dismissIntros(page);
  await page.waitForFunction(() => !!window.__pairfall);
  const bomb = await page.evaluate(() => window.__pairfall!.game.rules.bombSlots[0]);
  const badge = page.locator(`.tile[data-slot="${bomb}"] .bomb b`);
  const before = Number(await badge.textContent());
  expect(before).toBeGreaterThan(3);
  await page.evaluate(() => window.__pairfall!.tap(window.__pairfall!.level.solution[0]));
  await expect(badge).toHaveText(String(before - 1));
});

test('timed levels: the clock runs, stops while paused, and Continue adds 30 seconds', async ({ page }) => {
  await freshStart(page, '/?debug&level=60');
  await dismissIntros(page);
  await page.waitForFunction(() => !!window.__pairfall);
  const clock = page.locator('.hud .clock');
  await expect(clock).toBeVisible();
  await expect(clock).toHaveText(/^\d+:\d\d$/);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Pause' }).click();
  const paused = await page.evaluate(() => window.__pairfall!.game.elapsedMs);
  expect(paused).toBeGreaterThan(0);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__pairfall!.game.elapsedMs)).toBe(paused);
  await page.getByRole('button', { name: 'Resume' }).click();
  // run the clock down
  await page.evaluate(() => {
    const g = window.__pairfall!.game;
    g.elapsedMs = g.timeLimitMs - 400;
  });
  await expect(clock).toHaveClass(/low/);
  await expect(page.getByRole('dialog', { name: 'Time’s up' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Continue with \+30 seconds/ }).click();
  expect(await page.evaluate(() => window.__pairfall!.game.status)).toBe('playing');
  expect(await page.evaluate(() => Math.round(window.__pairfall!.game.timeLeftMs / 1000))).toBeGreaterThan(25);
});

test('jump straight to level 150 from the Journey map', async ({ page }) => {
  await freshStart(page);
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await page.getByRole('button', { name: 'Jump to a level' }).click();
  const sheet = page.getByRole('dialog', { name: 'Jump to a level' });
  await expect(sheet).toBeVisible();
  for (const n of [100, 150, 200]) await expect(sheet.getByRole('button', { name: `Level ${n}` })).toBeVisible();
  await sheet.getByRole('button', { name: 'Level 150' }).click();
  await expect(page.locator('.hud-title')).toContainText('Level 150');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pairfall.save')!).level)).toBe(150);
  // any number works too
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Level 149/ })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to a level' }).click();
  await page.getByRole('spinbutton', { name: 'Level number' }).fill('333');
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.locator('.hud-title')).toContainText('Level 333');
});
