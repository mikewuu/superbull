import { defineConfig } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3939);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1440, height: 900 },
  },
  globalSetup: './e2e/global-setup.ts',
  webServer: {
    command: 'tsx server.ts',
    port,
    reuseExistingServer: false,
    env: {
      PORT: String(port),
      REDIS_HOST: process.env.REDIS_HOST ?? '127.0.0.1',
      REDIS_PORT: process.env.REDIS_PORT ?? '6379',
      QUEUES: 'send-emails,process-videos,sync-contacts',
    },
  },
});
