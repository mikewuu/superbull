import fs from 'node:fs';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

// The first (and only, for the rest of the run) hub user is bootstrapped by
// e2e/configure-convex-auth.ts before next dev even starts (see that file
// for why). This signs in as that user through the real UI and saves the
// authenticated storage state so the `chromium` project's tests start signed
// in.
const statePath = path.join(process.cwd(), 'e2e', '.auth', 'state.json');
const E2E_EMAIL = 'e2e@superbull.test';
const E2E_PASSWORD = 'superbull-e2e-pw';

setup('sign in as the bootstrapped first user', async ({ page }) => {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });

  await page.goto('/signin');
  await page.getByTestId('signin-email').fill(E2E_EMAIL);
  await page.getByTestId('signin-password').fill(E2E_PASSWORD);
  await page.getByTestId('signin-submit').click();

  await page.waitForURL('/');
  await expect(page.getByTestId('sidebar-user-email')).toHaveText(E2E_EMAIL);

  await page.context().storageState({ path: statePath });
});
