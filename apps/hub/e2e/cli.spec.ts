import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { Queue, Worker } from 'bullmq';

const hubDir = process.cwd();
const cliPath = path.resolve(hubDir, '../../packages/proxy/dist/cli.js');
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
const connection = { host: '127.0.0.1', port: redisPort };
const proxyPort = 4656;

test.describe.configure({ mode: 'serial' });

let cli: ChildProcess | undefined;
let worker: Worker | undefined;
let sourceId = '';

test.afterAll(async () => {
  cli?.kill('SIGINT');
  await worker?.close();
});

test('the CLI discovers the queue, starts, and auto-registers with the hub', async ({ page }) => {
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
      'http://localhost:4600',
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

  await page.goto('/');
  const row = page.getByTestId('source-row').filter({ hasText: 'CLI Proxy' });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByTestId('source-health')).toContainText('online');

  const href = await row.getByRole('link').getAttribute('href');
  sourceId = href?.match(/\/s\/([^/]+)\//)?.[1] ?? '';
  expect(sourceId).not.toBe('');
});

test('the ingest loop reports new job completions to convex', async () => {
  worker = new Worker('hub-e2e', async () => ({ ok: true }), { connection });
  await worker.waitUntilReady();

  const before = countBySource(sourceId);

  const queue = new Queue('hub-e2e', { connection });
  await queue.addBulk([
    { name: 'cli-e2e-job-1', data: {} },
    { name: 'cli-e2e-job-2', data: {} },
  ]);
  await queue.close();

  await expect
    .poll(() => countBySource(sourceId), { timeout: 20_000, intervals: [1000] })
    .toBeGreaterThan(before);
});

function countBySource(id: string): number {
  const output = execFileSync(
    'npx',
    [
      'convex',
      'run',
      'ingest:countBySource',
      JSON.stringify({ internalToken: 'e2e-internal', sourceId: id }),
    ],
    { cwd: hubDir, encoding: 'utf8' },
  );
  return Number(output.trim());
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
