import { defineConfig } from '@playwright/test';

const convexUrl = 'http://127.0.0.1:3210';
const proxyPort = 4655;
const hubPort = 4600;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${hubPort}`,
    viewport: { width: 1440, height: 900 },
  },
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command: 'CONVEX_AGENT_MODE=anonymous npx convex dev',
      url: convexUrl,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'npx tsx e2e/start-e2e-proxy.ts',
      url: `http://127.0.0.1:${proxyPort}/healthz`,
      timeout: 30_000,
      reuseExistingServer: false,
      env: {
        REDIS_PORT: process.env.REDIS_PORT ?? '6379',
      },
    },
    {
      command: `npx next dev -p ${hubPort}`,
      url: `http://localhost:${hubPort}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_CONVEX_URL: convexUrl,
        CONVEX_INTERNAL_TOKEN: 'e2e-internal',
        HUB_API_TOKEN: 'e2e-hub-token',
      },
    },
  ],
});
