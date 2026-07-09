import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/queues/:queueName/metrics', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('MetricsTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('returns completed metrics buckets', async () => {
    const res = await testBoard.request('get', '/api/queues/MetricsTest/metrics?type=completed');

    expect(res.status).toBe(200);
    const body = res.body as { meta: { count: number }; data: number[]; count: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toHaveProperty('count');
    expect(body.meta).toHaveProperty('prev_ts');
  });

  it('returns failed metrics buckets', async () => {
    const res = await testBoard.request('get', '/api/queues/MetricsTest/metrics?type=failed');

    expect(res.status).toBe(200);
    expect(Array.isArray((res.body as { data: number[] }).data)).toBe(true);
  });

  it('rejects an invalid metrics type', async () => {
    const res = await testBoard.request('get', '/api/queues/MetricsTest/metrics?type=bogus');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown queue', async () => {
    const res = await testBoard.request('get', '/api/queues/Unknown/metrics');
    expect(res.status).toBe(404);
  });
});
