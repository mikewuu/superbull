import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { QueueConcurrency } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET/PUT /api/queues/:queueName/concurrency', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('ConcurrencyTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('returns null values when nothing is configured', async () => {
    const res = await testBoard.request('get', '/api/queues/ConcurrencyTest/concurrency');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ global_concurrency: null, rate_limit_ttl_ms: null });
  });

  it('sets and reads back global concurrency', async () => {
    const putRes = await testBoard.request('put', '/api/queues/ConcurrencyTest/concurrency', {
      global_concurrency: 5,
    });
    expect(putRes.status).toBe(204);

    const getRes = await testBoard.request('get', '/api/queues/ConcurrencyTest/concurrency');
    expect((getRes.body as QueueConcurrency).global_concurrency).toBe(5);
  });

  it('rejects a non-positive concurrency value', async () => {
    const res = await testBoard.request('put', '/api/queues/ConcurrencyTest/concurrency', {
      global_concurrency: 0,
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown queue', async () => {
    const res = await testBoard.request('get', '/api/queues/Unknown/concurrency');
    expect(res.status).toBe(404);
  });
});
