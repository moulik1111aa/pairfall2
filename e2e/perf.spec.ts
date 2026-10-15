import { test, expect } from 'playwright/test';

// Stress check (spec §11): biggest board + heavy particle bursts with the CPU slowed
// 4× as a stand-in for a phone. Headless Chromium paints at 60 Hz, so we look for
// dropped frames: the 95th-percentile frame gap must stay near one 60 Hz frame.
test('120-tile board with particle bursts keeps frames smooth under 4× CPU throttling', async ({ page }) => {
  await page.goto('/?debug&level=60');
  await page.waitForFunction(() => !!window.__pairfall);
  expect(await page.locator('.tile').count()).toBe(120);
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
    // play 24 moves quickly: tile flights, pair pops, combo bursts (~200 particles live)
    for (let i = 0; i < 24; i++) {
      pf.tap(sol[i]);
      await new Promise((r) => setTimeout(r, 90));
    }
    await new Promise((r) => setTimeout(r, 600));
    running = false;
    gaps.shift();
    gaps.sort((a, b) => a - b);
    return { p95: gaps[Math.floor(gaps.length * 0.95)], max: gaps[gaps.length - 1], frames: gaps.length };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log('frame gaps (ms):', stats);
  expect(stats.frames).toBeGreaterThan(60);
  expect(stats.p95).toBeLessThan(25);
});
