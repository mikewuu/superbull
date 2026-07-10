import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppQueue } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('queue workload fields', () => {
  let queue: Queue;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('WorkloadTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    await testBoard?.close();
    testBoard = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  async function getQueue(): Promise<AppQueue> {
    if (!testBoard) {
      testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    }
    const response = await testBoard.request('get', '/api/queues');
    const body = response.body as { queues: AppQueue[] };
    const found = body.queues.find((candidate) => candidate.name === 'WorkloadTest');
    if (!found) {
      throw new Error('WorkloadTest queue missing from response');
    }
    return found;
  }

  it('reports zero workers and null oldest wait for an empty queue', async () => {
    const appQueue = await getQueue();
    expect(appQueue.worker_count).toBe(0);
    expect(appQueue.oldest_waiting_ms).toBeNull();
  });

  it('reports the oldest waiting job age once jobs wait', async () => {
    await queue.add('first', { order: 1 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await queue.add('second', { order: 2 });

    const appQueue = await getQueue();
    expect(appQueue.oldest_waiting_ms).not.toBeNull();
    expect(appQueue.oldest_waiting_ms).toBeGreaterThanOrEqual(50);
  });
});
