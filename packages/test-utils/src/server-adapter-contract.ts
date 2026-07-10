import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type SeededQueue, seedQueue } from './redis-fixtures';

export interface NormalizedResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  text: string;
}

export interface ContractRequest {
  method: string;
  path: string;
  body?: unknown;
}

export interface Harness {
  request: (req: ContractRequest) => Promise<NormalizedResponse>;
  teardown: () => Promise<void>;
}

export function runServerAdapterContract(
  adapterName: string,
  makeHarness: (opts: { basePath: string; queue: SeededQueue }) => Promise<Harness>,
): void {
  describe(`${adapterName} server adapter contract`, () => {
    describe('mounted at root', () => {
      let queue: SeededQueue;
      let harness: Harness;
      const prefix = '';

      beforeAll(async () => {
        queue = await seedQueue();
        harness = await makeHarness({ basePath: prefix, queue });
      });

      afterAll(async () => {
        await harness.teardown();
        await queue.close();
      });

      it('serves the entry HTML with injected basePath + ui config', async () => {
        const res = await harness.request({ method: 'get', path: `${prefix}/` });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/html/);
        // board_title only reaches the HTML via the serialized ui config, so its
        // presence proves the config was actually injected.
        expect(res.text).toContain('board_title');
      });

      it('serves static assets', async () => {
        const res = await harness.request({
          method: 'get',
          path: `${prefix}/static/test-asset.txt`,
        });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text/);
        expect(res.text).toContain('superbull-static-fixture');
      });

      it('GET /api/queues returns the seeded queue as JSON', async () => {
        const res = await harness.request({ method: 'get', path: `${prefix}/api/queues` });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/json/);
        const body = JSON.parse(res.text);
        expect(body.queues.map((q: { name: string }) => q.name)).toContain(queue.name);
      });

      it('POST /api/queues/:queueName/add parses the body and adds a job', async () => {
        const res = await harness.request({
          method: 'post',
          path: `${prefix}/api/queues/${queue.name}/add`,
          body: { name: 'contract-job', data: { from: 'contract' }, options: null },
        });
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
        const jobs = await queue.queue.getJobs(['waiting', 'paused', 'delayed']);
        expect(jobs.some((job) => (job.data as { from?: string })?.from === 'contract')).toBe(true);
      });

      it('PUT /api/queues/:queueName/pause pauses the queue', async () => {
        const res = await harness.request({
          method: 'put',
          path: `${prefix}/api/queues/${queue.name}/pause`,
        });
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
        expect(await queue.queue.isPaused()).toBe(true);
      });

      it('GET /api/prometheus returns plain text, not JSON-quoted text', async () => {
        const res = await harness.request({ method: 'get', path: `${prefix}/api/prometheus` });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/plain/);
        expect(res.text.startsWith('"')).toBe(false);
      });

      it('returns a structured 404 for an unknown queue', async () => {
        const res = await harness.request({
          method: 'put',
          path: `${prefix}/api/queues/__does_not_exist__/pause`,
        });
        expect(res.status).toBe(404);
        expect(res.text).toContain('queue not found');
      });
    });

    describe('mounted under /ui (basePath)', () => {
      let queue: SeededQueue;
      let harness: Harness;
      const prefix = '/ui';

      beforeAll(async () => {
        queue = await seedQueue();
        harness = await makeHarness({ basePath: prefix, queue });
      });

      afterAll(async () => {
        await harness.teardown();
        await queue.close();
      });

      it('resolves API routes under the prefix', async () => {
        const res = await harness.request({ method: 'get', path: `${prefix}/api/queues` });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/json/);
        const body = JSON.parse(res.text);
        expect(body.queues.map((q: { name: string }) => q.name)).toContain(queue.name);
      });

      it('injects basePath into the entry HTML', async () => {
        const res = await harness.request({ method: 'get', path: `${prefix}/` });
        expect(res.status).toBe(200);
        expect(res.text).toContain(`<base href="${prefix}/"`);
      });
    });
  });
}
