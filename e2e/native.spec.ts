import { test, expect, type Page } from 'playwright/test';

// The Android shell, simulated: a fake `window.Capacitor` with the app's own
// `Pairfall` plugin, so the native wiring is exercised in the browser.
async function fakeShell(page: Page, store: Record<string, string> = {}) {
  await page.addInitScript((initial) => {
    const native = { calls: [] as string[], back: null as null | (() => void), store: { ...initial } as Record<string, string> };
    (window as unknown as { __native: typeof native }).__native = native;
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    (window as unknown as { Capacitor: unknown }).Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        Pairfall: {
          haptic: async (o: { kind: string }) => void native.calls.push(`haptic:${o.kind}`),
          keepAwake: async (o: { on: boolean }) => void native.calls.push(`awake:${o.on}`),
          exit: async () => void native.calls.push('exit'),
          readSave: async () => ({ values: native.store }),
          writeSave: async (o: { key: string; value: string }) => void (native.store[o.key] = o.value),
          addListener: (e: string, cb: () => void) => {
            if (e === 'back') native.back = cb;
            return {};
          },
        },
        SystemBars: { setStyle: async (o: { style: string }) => void native.calls.push(`bars:${o.style}`) },
      },
    };
  }, store);
}

const calls = (page: Page) => page.evaluate(() => (window as unknown as { __native: { calls: string[] } }).__native.calls);
const pressBack = (page: Page) => page.evaluate(() => (window as unknown as { __native: { back: () => void } }).__native.back());

test('android shell: back button, keep-awake, haptics, bar style and save mirror', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await fakeShell(page);
  await page.goto('/?debug');
  await expect(page.getByRole('heading', { name: 'Pairfall' })).toBeVisible();
  expect(await calls(page)).toEqual(expect.arrayContaining(['bars:LIGHT', 'awake:false']));

  // Home: the first press warns, the second leaves.
  await pressBack(page);
  await expect(page.locator('.toast')).toContainText('Press back again to leave');
  await expect(page.locator('.toast .hi')).toHaveText('बाहर जाने के लिए फिर से बैक दबाएँ');
  await pressBack(page);
  expect(await calls(page)).toContain('exit');

  // A sub-screen goes back home.
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Level 1', exact: true })).toBeVisible();
  await pressBack(page);
  await expect(page.getByRole('button', { name: 'Start playing' })).toBeVisible();

  // In a game: back pauses, back again resumes; the screen is kept awake.
  await page.getByRole('button', { name: 'Start playing' }).click();
  await page.waitForFunction(() => !!window.__pairfall);
  expect((await calls(page)).at(-1)).toBe('awake:true');
  await pressBack(page);
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await pressBack(page);
  await expect(page.getByRole('dialog', { name: 'Paused' })).toHaveCount(0);

  // Taps reach the phone's haptic engine.
  const first = await page.evaluate(() => (window.__pairfall!.level.solution as number[])[0]);
  await page.locator(`.tile[data-slot="${first}"]`).tap();
  await expect.poll(() => calls(page)).toContain('haptic:tap');

  // Every save is mirrored natively.
  const mirrored = await page.evaluate(() => (window as unknown as { __native: { store: Record<string, string> } }).__native.store['pairfall.save']);
  expect(JSON.parse(mirrored).stats.played).toBe(1);

  // A dark theme asks for light status-bar icons.
  await page.evaluate(() => {
    const app = (window as unknown as { __app: { setTheme(t: unknown): void } }).__app;
    app.setTheme({ ...((window as unknown as { __app: { theme: object } }).__app.theme), vars: { '--bg': '#0E1330' } });
  });
  expect(await calls(page)).toContain('bars:DARK');
  expect(errors).toEqual([]);
});

test('android shell: a wiped WebView save comes back from the native mirror', async ({ page }) => {
  const save = JSON.stringify({ version: 1, level: 12, coins: 345 });
  await fakeShell(page, { 'pairfall.save': save, 'pairfall.save.bak': save });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play level 12' })).toBeVisible();
  await expect(page.locator('.coins').first()).toContainText('345');
});
