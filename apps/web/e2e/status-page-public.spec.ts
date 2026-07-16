import { expect, test } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

// Public status pages must stay reachable without a hub session — override
// the chromium project's default (already-authenticated) storage state with
// a fresh, logged-out context.
test.use({ storageState: { cookies: [], origins: [] } });

test('a public status page loads without auth state', async ({ page }) => {
  const convex = new ConvexHttpClient('http://127.0.0.1:3210');
  const createConnector = makeFunctionReference<'mutation'>('connectors:create');
  const upsertStatusPage = makeFunctionReference<'mutation'>('statusPages:upsertLegacy');

  const connector = await convex.mutation(createConnector, {
    internalToken: 'e2e-internal',
    name: 'Status Page E2E Connector',
    url: 'http://127.0.0.1:4655',
    token: 'unused',
  });

  await convex.mutation(upsertStatusPage, {
    internalToken: 'e2e-internal',
    connectorId: connector._id,
    slug: 'e2e-public-status',
    isEnabled: true,
    title: 'E2E Public Status',
  });

  await page.goto('/status/e2e-public-status');
  await expect(page.getByRole('heading', { name: 'E2E Public Status' })).toBeVisible();
});
