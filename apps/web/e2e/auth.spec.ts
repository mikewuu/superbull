import { expect, test } from '@playwright/test';

// Signed-out behavior only — override the chromium project's default
// (already-authenticated) storage state with a fresh, logged-out context.
test.use({ storageState: { cookies: [], origins: [] } });

const E2E_EMAIL = 'e2e@superbull.test';

test('redirects to /signin when logged out', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/signin$/);
});

test('signin via test-login lands in a project', async ({ page }) => {
  await page.goto('/signin');
  await page.getByTestId('signin-test-login').click();

  await page.waitForURL(/\/app\/[^/]+/);
  await expect(page.getByTestId('sidebar-user-email')).toHaveText(E2E_EMAIL);
  await expect(page).toHaveURL(/\/app\/[^/]+\/connectors/);
});
