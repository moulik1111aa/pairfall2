import { test, expect, type Page } from 'playwright/test';

async function freshStart(page: Page, url = '/?debug') {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
}

/** Tap a tile with a real touch on its element. */
async function tapSlot(page: Page, slot: number) {
  await page.locator(`.tile[data-slot="${slot}"]`).tap();
}

test('first launch: play level 1 to a win, progress is saved', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await freshStart(page);
  await expect(page.getByRole('heading', { name: 'Pairfall' })).toBeVisible();
  await page.getByRole('button', { name: 'Start playing' }).click();
  await expect(page.locator('.hud-title')).toHaveText('Level 1');
  await expect(page.locator('.coach')).toContainText('Tap a tile');
  await page.waitForFunction(() => !!window.__pairfall);

  const solution = await page.evaluate(() => window.__pairfall!.level.solution as number[]);
  // First two moves with real touches (tests hit-testing), the rest via the debug hook.
  await tapSlot(page, solution[0]);
  await expect(page.locator('.coach')).toContainText('twin');
  await tapSlot(page, solution[1]);
  for (const s of solution.slice(2)) {
    await page.evaluate((slot) => window.__pairfall!.tap(slot), s);
    await page.waitForTimeout(30);
  }
  await expect(page.getByRole('dialog', { name: 'Level 1 cleared' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.stars')).toHaveAttribute('aria-label', /3 of 3 stars|2 of 3 stars/);

  // Level 2 was generated in the background while level 1 was played.
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Play level 2' }).click();
  await expect(page.locator('.tile').first()).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(1000);

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play level 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Journey map' }).click();
  await expect(page.getByRole('button', { name: /Level 1, [23] stars/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Level 3, locked' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('filling the tray loses, danger shows one slot before', async ({ page }) => {
  await freshStart(page, '/?debug&level=11');
  await page.waitForFunction(() => !!window.__pairfall);
  const picks = await page.evaluate(() => {
    const g = window.__pairfall!.game;
    const seen = new Set<number>();
    const out: number[] = [];
    for (const s of g.board.freeSlots()) {
      if (!seen.has(g.kinds[s])) {
        seen.add(g.kinds[s]);
        out.push(s);
      }
    }
    return { picks: out, limit: g.limit };
  });
  expect(picks.limit).toBe(4);
  expect(picks.picks.length).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < 3; i++) await tapSlot(page, picks.picks[i]);
  await expect(page.locator('.tray')).toHaveClass(/danger/);
  await tapSlot(page, picks.picks[3]);
  await expect(page.getByRole('dialog', { name: 'Tray full' })).toBeVisible({ timeout: 4000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.tray')).not.toHaveClass(/danger/);
});

test('blocked tiles ignore taps; pause sheet resumes', async ({ page }) => {
  await freshStart(page, '/?debug&level=37');
  await page.waitForFunction(() => !!window.__pairfall);
  const blocked = await page.evaluate(() => {
    const g = window.__pairfall!.game;
    return g.board.presentSlots().find((s) => !g.board.isFree(s))!;
  });
  await page.locator(`.tile[data-slot="${blocked}"]`).dispatchEvent('pointerdown');
  expect(await page.evaluate(() => window.__pairfall!.game.tray.length)).toBe(0);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toHaveCount(0);
});
