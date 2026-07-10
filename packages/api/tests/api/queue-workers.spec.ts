import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppWorker } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/queues/:queueName/workers', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('WorkersTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    await testBoard?.close();
    testBoard = undefined;
    await worker?.close();
    worker = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('lists connected workers with redis client info', async () => {
    worker = new Worker('WorkersTest', async () => 'ok', { connection, name: 'worker-a' });
    await worker.waitUntilReady();

    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const res = await testBoard.request('get', '/api/queues/WorkersTest/workers');

    expect(res.status).toBe(200);
    const body = res.body as { workers: AppWorker[] };
    expect(body.workers.length).toBeGreaterThanOrEqual(1);
    expect(body.workers[0]?.id).toBeTruthy();
    expect(body.workers[0]?.addr).toBeTruthy();
  });

  it('returns an empty list when no workers are connected', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const res = await testBoard.request('get', '/api/queues/WorkersTest/workers');

    expect(res.status).toBe(200);
    expect((res.body as { workers: AppWorker[] }).workers).toEqual([]);
  });

  it('returns 404 for an unknown queue', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const res = await testBoard.request('get', '/api/queues/Unknown/workers');
    expect(res.status).toBe(404);
  });
});
