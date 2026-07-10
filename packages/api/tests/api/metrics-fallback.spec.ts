import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { QueueMetrics } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/queues/:queueName/metrics without worker metrics', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('MetricsFallbackTest', { connection });
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

  it('derives per-minute buckets from finished jobs', async () => {
    worker = new Worker('MetricsFallbackTest', async () => 'done', { connection });
    await queue.addBulk([
      { name: 'a', data: {} },
      { name: 'b', data: {} },
      { name: 'c', data: {} },
    ]);
    await waitForCompleted(queue, 3);

    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const response = await testBoard.request(
      'get',
      '/api/queues/MetricsFallbackTest/metrics?type=completed',
    );
    const metrics = response.body as QueueMetrics;

    expect(response.status).toBe(200);
    expect(metrics.meta.count).toBe(3);
    const bucketSum = metrics.data.reduce((total, value) => total + value, 0);
    expect(bucketSum).toBe(3);
  });
});

async function waitForCompleted(queue: Queue, expected: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const counts = await queue.getJobCounts('completed');
    if ((counts.completed ?? 0) >= expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('jobs did not complete in time');
}
