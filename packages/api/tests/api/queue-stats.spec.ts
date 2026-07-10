import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { QueueStats } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/queues/:queueName/stats', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('StatsTest', { connection });
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

  it('derives wait/run percentiles, retry rate and top errors from a job window', async () => {
    worker = new Worker(
      'StatsTest',
      async (job) => {
        if (job.data.fail) {
          throw new Error('boom');
        }
        return 'ok';
      },
      { connection },
    );

    await queue.addBulk([
      { name: 'a', data: {}, opts: { attempts: 1 } },
      { name: 'b', data: {}, opts: { attempts: 1 } },
      { name: 'c', data: { fail: true }, opts: { attempts: 1 } },
      { name: 'd', data: { fail: true }, opts: { attempts: 1 } },
    ]);
    await waitForFinished(queue, 4);

    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const res = await testBoard.request('get', '/api/queues/StatsTest/stats');

    expect(res.status).toBe(200);
    const body = res.body as QueueStats;
    expect(body.completed_count_window).toBe(2);
    expect(body.failed_count_window).toBe(2);
    expect(body.wait_ms.p50).not.toBeNull();
    expect(body.run_ms.p50).not.toBeNull();
    expect(body.retry_rate).toBe(0);
    expect(body.stalled_count).toBe(0);
    expect(body.top_errors).toEqual([{ message: 'boom', count: 2 }]);
    expect(body.est_drain_ms).toBe(0);
  });

  it('returns nulls and zero counts for an empty queue', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const res = await testBoard.request('get', '/api/queues/StatsTest/stats');

    expect(res.status).toBe(200);
    const body = res.body as QueueStats;
    expect(body.wait_ms).toEqual({ p50: null, p95: null });
    expect(body.run_ms).toEqual({ p50: null, p95: null });
    expect(body.completed_count_window).toBe(0);
    expect(body.failed_count_window).toBe(0);
    expect(body.top_errors).toEqual([]);
    expect(body.est_drain_ms).toBe(0);
  });

  it('returns 404 for an unknown queue', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const res = await testBoard.request('get', '/api/queues/Unknown/stats');
    expect(res.status).toBe(404);
  });
});

async function waitForFinished(queue: Queue, expected: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const counts = await queue.getJobCounts('completed', 'failed');
    if ((counts.completed ?? 0) + (counts.failed ?? 0) >= expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('jobs did not finish in time');
}
