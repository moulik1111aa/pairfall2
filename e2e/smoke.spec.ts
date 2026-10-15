import { test, expect } from 'playwright/test';

test('app loads and shows the title', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Pairfall');
  await expect(page.locator('#app')).toContainText('Pairfall');
  expect(errors).toEqual([]);
});
