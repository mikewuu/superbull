import { existsSync, renameSync, rmSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Playwright re-evaluates this config file inside every test worker process,
// not just the runner — any side effect here runs again mid-run. The
// TEST_WORKER_INDEX guard limits side effects to the runner's single
// evaluation before the webServers boot. (Without it, a worker-time re-stash
// of the .env.local that `convex dev` regenerates would clobber the real
// stash — it survives only because convex regenerates identical bytes.)
const isRunnerProcess = process.env.TEST_WORKER_INDEX === undefined;

// convex dev latches onto .env.local's cloud deployment; the e2e run must get
// the anonymous local backend, so the file is stashed before servers boot and
// restored in global teardown. If a stash already exists, a previous run
// crashed before teardown — that stash IS the user's original, and the
// current .env.local is convex-generated junk; never rename over the stash.
function stashEnvLocal(): void {
  if (!existsSync('.env.local')) {
    return;
  }
  if (existsSync('.env.local.e2e-stash')) {
    rmSync('.env.local');
    return;
  }
  renameSync('.env.local', '.env.local.e2e-stash');
}
if (isRunnerProcess) {
  stashEnvLocal();
}

const convexUrl = 'http://127.0.0.1:3210';
const webPort = 4700;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${webPort}`,
    viewport: { width: 1440, height: 900 },
  },
  globalTeardown: './e2e/global-teardown.ts',
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: 'e2e/.auth/state.json' },
    },
  ],
  webServer: [
    {
      // rm: the anonymous local backend persists on disk across runs, which
      // would leak the previous run's bootstrapped first user into this one
      // and trip the first-user sign-up gate. It must happen HERE (the
      // command runs exactly once, before the backend boots) — never at
      // config scope, where worker re-evaluation would delete the database
      // out from under the running backend mid-run.
      command: 'rm -rf .convex/local && CONVEX_AGENT_MODE=anonymous npx convex dev',
      url: convexUrl,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `npx tsx e2e/configure-convex-auth.ts && npx next dev -p ${webPort}`,
      url: `http://localhost:${webPort}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_CONVEX_URL: convexUrl,
        CONVEX_INTERNAL_TOKEN: 'e2e-internal',
        SUPERBULL_API_TOKEN: 'e2e-hub-token',
        // NEXT_PUBLIC_* vars are inlined into the client bundle at `next
        // dev` boot time, so this must live here rather than being set on
        // the Convex deployment (that's AUTH_TEST_LOGIN, no NEXT_PUBLIC_
        // prefix — see e2e/configure-convex-auth.ts). This is what makes
        // src/app/signin/_components/sign-in-form.tsx render the
        // signin-test-login button.
        NEXT_PUBLIC_AUTH_TEST_LOGIN: 'true',
      },
    },
  ],
});
