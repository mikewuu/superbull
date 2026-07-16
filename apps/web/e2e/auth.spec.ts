import { expect, test } from '@playwright/test';

// Signed-out behavior only — override the chromium project's default
// (already-authenticated) storage state with a fresh, logged-out context.
test.use({ storageState: { cookies: [], origins: [] } });

const E2E_EMAIL = 'e2e@superbull.test';
const E2E_PASSWORD = 'superbull-e2e-pw';

test('redirects to /signin when logged out', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/signin$/);
});

test('signin works with the bootstrapped user', async ({ page }) => {
  await page.goto('/signin');
  await page.getByTestId('signin-email').fill(E2E_EMAIL);
  await page.getByTestId('signin-password').fill(E2E_PASSWORD);
  await page.getByTestId('signin-submit').click();

  await page.waitForURL('/app');
  await expect(page.getByTestId('sidebar-user-email')).toHaveText(E2E_EMAIL);
});

test('second signup is blocked once a user exists', async ({ page }) => {
  await page.goto('/signin');

  await expect(page.getByTestId('signin-toggle-flow')).not.toBeVisible();
  await expect(page.getByText('Ask an existing user to invite you.')).toBeVisible();
});

test('the server rejects a second sign-up even when the UI is bypassed', async ({ request }) => {
  const response = await request.post('/api/auth', {
    data: {
      action: 'auth:signIn',
      args: {
        provider: 'password',
        params: { flow: 'signUp', email: 'intruder@superbull.test', password: 'intruder-pw-123' },
      },
    },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error).toContain('Ask an existing user to invite you');
});
