import { test, expect } from 'playwright/test';

// Stress check (spec §11): biggest board + heavy particle bursts with the CPU slowed
// 4× as a stand-in for a phone. Headless Chromium paints at 60 Hz in software, so we
// count dropped frames: fewer than 5% of frames may take longer than one 60 Hz frame
// (the same bar as a 95th-percentile frame time under 20 ms).
test('120-tile board with particle bursts keeps frames smooth under 4× CPU throttling', async ({ page }) => {
  await page.goto('/?debug&level=60');
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.stage .tile').count()) break;
    const b = page.getByRole('button', { name: 'Got it' });
    if (await b.count()) await b.click();
    else await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => !!window.__pairfall);
  expect(await page.locator('.stage .tile').count()).toBe(120);
  await page.waitForTimeout(1500); // let the opening deal-in animation finish
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const stats = await page.evaluate(async () => {
    const pf = window.__pairfall!;
    const sol = pf.level.solution as number[];
    const gaps: number[] = [];
    let last = performance.now();
    let running = true;
    const loop = (t: number) => {
      gaps.push(t - last);
      last = t;
      if (running) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // 40 quick moves: tile flights, pair pops, shockwaves, combo bursts
    for (let i = 0; i < 40; i++) {
      pf.tap(sol[i]);
      await new Promise((r) => setTimeout(r, 90));
    }
    await new Promise((r) => setTimeout(r, 600));
    running = false;
    gaps.shift();
    const slow = gaps.filter((g) => g > 20).length;
    return { frames: gaps.length, slow, slowShare: slow / gaps.length, max: Math.max(...gaps) };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log('frames:', stats);
  expect(stats.frames).toBeGreaterThan(120);
  expect(stats.slowShare).toBeLessThan(0.05);
});
