import { test, expect } from 'playwright/test';

test('app loads to the home screen without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Pairfall');
  await expect(page.getByRole('heading', { name: 'Pairfall' })).toBeVisible();
  expect(errors).toEqual([]);
});
