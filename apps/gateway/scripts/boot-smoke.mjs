#!/usr/bin/env node
/**
 * Boot smoke for the built gateway artifact (dist/main.js): starts the real
 * process with dummy env, waits for /healthz, then exercises the internal
 * HTTP surface that never reaches Convex (auth rejection, disconnected
 * status, disconnected RPC). Exits non-zero on any mismatch.
 *
 * Run after `turbo run build --filter=@superbull/gateway`:
 *   pnpm --filter @superbull/gateway smoke
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.SMOKE_PORT ?? 4655);
const baseUrl = `http://127.0.0.1:${port}`;
const internalToken = 'smoke-internal-token';

const child = spawn(process.execPath, [join(packageRoot, 'dist/main.js')], {
  env: {
    ...process.env,
    PORT: String(port),
    CONVEX_URL: 'https://smoke-gateway.convex.cloud',
    CONVEX_INTERNAL_TOKEN: 'smoke-convex-token',
    GATEWAY_INTERNAL_TOKEN: internalToken,
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

let childExited = false;
child.on('exit', (code, signal) => {
  childExited = true;
  if (!shuttingDown) {
    console.error(`boot-smoke: gateway exited early (code=${code}, signal=${signal})`);
    process.exit(1);
  }
});

let shuttingDown = false;

function fail(message) {
  console.error(`boot-smoke: FAIL: ${message}`);
  shuttingDown = true;
  child.kill('SIGKILL');
  process.exit(1);
}

async function waitForHealthz() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (childExited) {
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.status === 200) {
        const body = await response.json();
        if (body.ok !== true) {
          fail(`/healthz returned ${JSON.stringify(body)}`);
        }
        return;
      }
    } catch {
      // not listening yet
    }
    await sleep(250);
  }
  fail('/healthz did not become ready within 15s');
}

async function main() {
  await waitForHealthz();
  console.log('boot-smoke: /healthz ok');

  const unauthenticated = await fetch(`${baseUrl}/internal/connectors/conn_smoke/status`);
  if (unauthenticated.status !== 401) {
    fail(`status without bearer: expected 401, got ${unauthenticated.status}`);
  }

  const status = await fetch(`${baseUrl}/internal/connectors/conn_smoke/status`, {
    headers: { authorization: `Bearer ${internalToken}` },
  });
  const statusBody = await status.json();
  if (status.status !== 200 || statusBody.connected !== false) {
    fail(
      `status with bearer: expected 200 {connected:false}, got ${status.status} ${JSON.stringify(statusBody)}`,
    );
  }

  const rpc = await fetch(`${baseUrl}/internal/rpc`, {
    method: 'POST',
    headers: { authorization: `Bearer ${internalToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      connector_id: 'conn_smoke',
      method: 'GET',
      path: ['api', 'queues'],
      search: '',
      body: null,
      content_type: null,
    }),
  });
  const rpcBody = await rpc.json();
  if (rpc.status !== 502 || rpcBody.error !== 'connector disconnected') {
    fail(
      `rpc to disconnected connector: expected 502 connector disconnected, got ${rpc.status} ${JSON.stringify(rpcBody)}`,
    );
  }

  console.log('boot-smoke: internal API surface ok');

  shuttingDown = true;
  child.kill('SIGTERM');
  const deadline = Date.now() + 10_000;
  while (!childExited && Date.now() < deadline) {
    await sleep(100);
  }
  if (!childExited) {
    console.error('boot-smoke: FAIL: gateway did not shut down within 10s of SIGTERM');
    child.kill('SIGKILL');
    process.exit(1);
  }
  console.log('boot-smoke: clean shutdown ok');
  process.exit(0);
}

main().catch((error) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
