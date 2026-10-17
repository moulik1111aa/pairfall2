import { test, expect, type Page } from 'playwright/test';

async function freshStart(page: Page, url = '/?debug') {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
}

/** Close any "new tile" introduction cards. */
async function dismissIntros(page: Page) {
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.stage .tile').count()) return;
    const b = page.getByRole('button', { name: 'Got it' });
    if (await b.count()) await b.click();
    else await page.waitForTimeout(150);
  }
  await page.waitForSelector('.stage .tile');
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
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await expect(page.getByRole('button', { name: /Level 1, [23] stars/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Level 3, locked' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('filling the tray loses, danger shows one slot before', async ({ page }) => {
  await freshStart(page, '/?debug&level=11');
  await dismissIntros(page);
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
  await dismissIntros(page);
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

test('new special tiles are introduced once', async ({ page }) => {
  await freshStart(page, '/?debug&level=36');
  // the edge rule is explained first, once, then each new tile
  await expect(page.getByRole('dialog', { name: 'Only edge tiles' })).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('dialog', { name: 'Face-down tiles' })).toBeVisible();
  await dismissIntros(page);
  await page.goto('/?debug&level=36');
  await page.waitForSelector('.stage .tile');
  await expect(page.getByRole('button', { name: 'Got it' })).toHaveCount(0);
  await expect(page.locator('.tile.frozen').first()).toBeVisible();
  await expect(page.locator('.tile.locked')).toHaveCount(1);
});

test('power-ups: hint glows a tile, undo takes a tile back, shuffle keeps the board', async ({ page }) => {
  await freshStart(page, '/?debug&level=12');
  await dismissIntros(page);
  await page.waitForFunction(() => !!window.__pairfall);
  await page.getByRole('button', { name: /^Hint/ }).click();
  await expect(page.locator('.tile.hint').first()).toBeVisible();
  // a tile with no twin in the tray goes in; undo brings it back
  const slot = await page.evaluate(() => {
    const g = window.__pairfall!.game;
    return g.board.freeSlots().find((s) => g.canTap(s))!;
  });
  await page.evaluate((s) => window.__pairfall!.tap(s), slot);
  await page.getByRole('button', { name: /^Undo/ }).click();
  expect(await page.evaluate(() => window.__pairfall!.game.tray.length)).toBe(0);
  const before = await page.evaluate(() => [...window.__pairfall!.game.kinds].sort().join());
  await page.getByRole('button', { name: /^Shuffle/ }).click();
  const after = await page.evaluate(() => [...window.__pairfall!.game.kinds].sort().join());
  expect(after).toBe(before);
  // all free uses spent: the next hint costs coins
  await expect(page.getByRole('button', { name: /^Hint, 20 coins/ })).toBeVisible();
});

test('lose then continue with an extra slot', async ({ page }) => {
  await freshStart(page, '/?debug&level=11');
  await dismissIntros(page);
  await page.waitForFunction(() => !!window.__pairfall);
  const picks = await page.evaluate(() => {
    const g = window.__pairfall!.game;
    const seen = new Set<number>();
    return g.board.freeSlots().filter((s) => !seen.has(g.kinds[s]) && seen.add(g.kinds[s]));
  });
  for (let i = 0; i < 4; i++) await tapSlot(page, picks[i]);
  await expect(page.getByRole('dialog', { name: 'Tray full' })).toBeVisible({ timeout: 4000 });
  await page.getByRole('button', { name: /Continue with \+1 slot/ }).click();
  expect(await page.evaluate(() => window.__pairfall!.game.status)).toBe('playing');
  expect(await page.evaluate(() => window.__pairfall!.game.limit)).toBe(5);
  await expect(page.locator('.well')).toHaveCount(5);
});

test('daily challenge pays once and starts a streak', async ({ page }) => {
  await freshStart(page, '/?debug');
  await page.getByRole('button', { name: /Daily challenge/ }).click();
  await dismissIntros(page);
  await page.waitForFunction(() => !!window.__pairfall);
  const sol = await page.evaluate(() => window.__pairfall!.level.solution as number[]);
  for (const s of sol) await page.evaluate((slot) => window.__pairfall!.tap(slot), s);
  await expect(page.getByRole('dialog', { name: 'Daily challenge cleared' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Streak: 1 day')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pairfall.save')!).coins)).toBe(150);
});

test('zen mode has no tray limit and offers a new board', async ({ page }) => {
  await freshStart(page, '/?debug');
  await page.getByRole('button', { name: /Zen/ }).click();
  await dismissIntros(page);
  await page.waitForFunction(() => !!window.__pairfall);
  expect(await page.evaluate(() => window.__pairfall!.game.limit)).toBe(Infinity);
  await expect(page.locator('.well')).toHaveCount(7);
  await expect(page.getByRole('button', { name: /^\+1 Slot/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New board' })).toBeVisible();
});
test('How to play: one big card at a time, English with Hindi, Back / Next and section tabs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await freshStart(page);
  await expect(page.locator('.tagline .hi')).toHaveText('जोड़ियाँ मिलाएँ, ट्रे खाली रखें।');
  await page.getByRole('button', { name: 'How to play' }).click();

  const card = page.locator('.help-card-big');
  await expect(card.locator('h2 .en')).toHaveText('Tap a tile');
  await expect(card.locator('h2 .hi')).toHaveText('टाइल पर टैप करें');
  await expect(page.locator('.help-count')).toHaveText('1 of 21');
  await expect(page.locator('.help-prev')).toBeDisabled();
  // Large type for easy reading.
  expect(parseFloat(await card.locator('p .en').evaluate((e) => getComputedStyle(e.parentElement!).fontSize))).toBeGreaterThanOrEqual(19);

  await page.locator('.help-next').click();
  await expect(card.locator('h2 .en')).toHaveText('Make pairs');
  await page.locator('.help-prev').click();
  await expect(card.locator('h2 .en')).toHaveText('Tap a tile');

  // Tabs jump to a section; every card fits without scrolling.
  await page.locator('.help-tab[data-section="specials"]').click();
  await expect(card.locator('h2 .en')).toHaveText('Face-down tiles');
  await page.locator('.help-next').click();
  await expect(card.locator('h2 .hi')).toHaveText('जमी हुई टाइलें');
  await expect(card.locator('.help-note')).toContainText('From level 20');
  for (let i = 0; i < 21; i++) {
    expect(await card.evaluate((e) => e.scrollHeight <= e.clientHeight + 1)).toBe(true);
    if (await page.locator('.help-next .en').textContent() === 'Done') break;
    await page.locator('.help-next').click();
  }
  await page.locator('.help-next').click(); // Done
  await expect(page.getByRole('button', { name: 'Start playing' })).toBeVisible();

  // The tutorial coach speaks both languages.
  await page.getByRole('button', { name: 'Start playing' }).click();
  await expect(page.locator('.coach .en')).toHaveText('Tap a tile to move it into the tray');
  await expect(page.locator('.coach .hi')).toHaveText('किसी टाइल पर टैप करें, वह ट्रे में चली जाएगी');

  // Turn Hindi off: English only.
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /Hindi instructions/ }).uncheck();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('.tagline')).toHaveText('Match the pairs. Keep the tray clear.');
  await expect(page.locator('.tagline .hi')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('special-tile introduction explains frozen tiles in both languages', async ({ page }) => {
  await freshStart(page);
  await page.evaluate(() => {
    const app = (window as unknown as { __app: { save: { update(fn: (d: { level: number; seenIntro: string[] }) => void): void } } }).__app;
    app.save.update((d) => {
      d.level = 20;
      d.seenIntro = ['edges', 'mystery'];
    });
  });
  await page.goto('/?debug&level=20');
  const card = page.getByRole('dialog', { name: 'Frozen tiles' });
  await expect(card).toBeVisible({ timeout: 15000 });
  await expect(card.locator('h2 .hi')).toHaveText('जमी हुई टाइलें');
  await expect(card.locator('p .hi')).toContainText('बर्फ़');
  // The picture shows the ice itself, not just the counter.
  expect(await card.locator('.ice').evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('url(');
});
