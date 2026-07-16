import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { Queue, Worker } from 'bullmq';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

const webDir = process.cwd();
const cliPath = path.resolve(webDir, '../../packages/proxy/dist/cli.js');
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
const connection = { host: '127.0.0.1', port: redisPort };
const proxyPort = 4656;

test.describe.configure({ mode: 'serial' });

let cli: ChildProcess | undefined;
let worker: Worker | undefined;
let connectorId = '';

test.afterAll(async () => {
  cli?.kill('SIGINT');
  await worker?.close();
});

test('the CLI discovers the queue, starts, and auto-registers with the hub', async ({ page }) => {
  // next dev compiles routes lazily; a cold compile of the register route can
  // outlast the CLI's 3-attempt registration window, so warm it first.
  await fetch('http://localhost:4700/api/sources/register', { method: 'POST' }).catch(
    () => undefined,
  );

  cli = spawn(
    process.execPath,
    [
      cliPath,
      '--queues',
      'hub-e2e',
      '-t',
      'cli-proxy-token',
      '--port',
      String(proxyPort),
      '--hub',
      'http://localhost:4700',
      '--hub-token',
      'e2e-hub-token',
      '--advertise-url',
      `http://127.0.0.1:${proxyPort}`,
      '-n',
      'CLI Proxy',
    ],
    { env: { ...process.env, REDIS_PORT: String(redisPort) }, stdio: 'pipe' },
  );

  await waitForHealthz(`http://127.0.0.1:${proxyPort}/healthz`);

  await page.goto('/app');
  const row = page.getByTestId('connector-row').filter({ hasText: 'CLI Proxy' });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByTestId('connector-health')).toContainText('online');

  const href = await row.getByRole('link').getAttribute('href');
  connectorId = href?.match(/\/app\/[^/]+\/connectors\/([^/]+)\//)?.[1] ?? '';
  expect(connectorId).not.toBe('');
});

test('the ingest loop reports new job completions to convex', async () => {
  worker = new Worker('hub-e2e', async () => ({ ok: true }), { connection });
  await worker.waitUntilReady();

  const before = await countByConnector(connectorId);

  const queue = new Queue('hub-e2e', { connection });
  await queue.addBulk([
    { name: 'cli-e2e-job-1', data: {} },
    { name: 'cli-e2e-job-2', data: {} },
  ]);
  await queue.close();

  await expect
    .poll(() => countByConnector(connectorId), { timeout: 20_000, intervals: [1000] })
    .toBeGreaterThan(before);
});

async function countByConnector(id: string): Promise<number> {
  const client = new ConvexHttpClient('http://127.0.0.1:3210');
  const reference = makeFunctionReference<'query'>('ingest:countByConnector');
  const count = await client.query(reference, { internalToken: 'e2e-internal', connectorId: id });
  return Number(count);
}

async function waitForHealthz(url: string): Promise<void> {
  for (let attempt = 0; attempt < 75; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // proxy not listening yet
    }
    await sleep(200);
  }
  throw new Error(`proxy did not become healthy: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
