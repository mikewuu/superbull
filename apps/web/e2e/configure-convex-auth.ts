import { execSync } from 'node:child_process';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

// Runs as a prerequisite step of the hub's webServer command, before `next
// dev` starts — not as Playwright globalSetup. Playwright's webServer `url`
// readiness check only waits for the port to accept connections, which
// happens before `convex dev` finishes pushing the schema/functions (and
// again before it's done applying each `env set` below, which each trigger
// their own redeploy). So this waits for a real query — and, at the end, the
// real first sign-in — to succeed before next dev starts serving pages.
const convexUrl = 'http://127.0.0.1:3210';

async function main(): Promise<void> {
  await waitForDeployed();

  execSync('npx convex env set CONVEX_INTERNAL_TOKEN e2e-internal', { stdio: 'inherit' });
  await waitForDeployed();

  // Registers convex/auth.ts's test-login ConvexCredentials provider (id
  // 'test-login') — only ever set on this anonymous e2e deployment, never in
  // production. See src/app/signin/_components/sign-in-form.tsx for the
  // matching NEXT_PUBLIC_AUTH_TEST_LOGIN client flag (set separately, in
  // playwright.config.ts's `web` webServer env block).
  execSync('npx convex env set AUTH_TEST_LOGIN true', { stdio: 'inherit' });
  await waitForDeployed();

  // @convex-dev/auth signs session JWTs with these; `npx @convex-dev/auth`
  // would normally generate and set them interactively during setup. The
  // e2e run gets a fresh anonymous backend every time, so they're generated
  // and set here instead.
  const keys = await generateKeyPair('RS256');
  const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, ' ');
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] });

  setEnvVar('JWT_PRIVATE_KEY', privateKey);
  await waitForDeployed();
  setEnvVar('JWKS', jwks);
  await waitForDeployed();
  await bootstrapFirstUser();
}

function setEnvVar(name: string, value: string): void {
  const escaped = value.replace(/"/g, '\\"');
  execSync(`npx convex env set -- ${name} "${escaped}"`, { stdio: 'ignore' });
}

async function waitForDeployed(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: 'connectors:list',
          args: { internalToken: '' },
          format: 'json',
        }),
      });
      const body = (await response.json()) as { status?: string; errorMessage?: string };
      // A real error from our own guardInternalToken() check (wrong token)
      // proves the function deployed and ran — as opposed to the backend's
      // generic "still deploying" InternalServerError.
      if (body.status === 'success' || body.errorMessage?.includes('unauthorized')) {
        return;
      }
    } catch {
      // convex backend not listening yet
    }
    await sleep(200);
  }
  throw new Error(`convex backend did not finish deploying: ${convexUrl}`);
}

// The first user has to exist before e2e/auth.setup.ts signs in through the
// UI; creating it here doubles as the write-path readiness probe (writes are
// a separate redeploy target from the reads waitForDeployed exercises). The
// test-login provider ignores its credentials and always resolves to the
// hardcoded e2e@superbull.test account (see convex/auth.ts).
async function bootstrapFirstUser(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const response = await fetch(`${convexUrl}/api/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: 'auth:signIn',
          args: { provider: 'test-login', params: {} },
          format: 'json',
        }),
      });
      const body = (await response.json()) as { status?: string };
      if (body.status === 'success') {
        return;
      }
    } catch {
      // convex backend not listening yet, or still settling a redeploy
    }
    await sleep(200);
  }
  throw new Error(`could not bootstrap the first user: ${convexUrl}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
