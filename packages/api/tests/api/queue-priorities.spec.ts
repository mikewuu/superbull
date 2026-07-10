import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { QueuePriorityCount } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/queues/:queueName/priorities', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('PrioritiesTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('returns per-priority counts for prioritized jobs', async () => {
    await queue.add('a', {}, { priority: 1 });
    await queue.add('b', {}, { priority: 1 });
    await queue.add('c', {}, { priority: 3 });

    const res = await testBoard.request('get', '/api/queues/PrioritiesTest/priorities');

    expect(res.status).toBe(200);
    const body = res.body as { priorities: QueuePriorityCount[] };
    expect(body.priorities).toEqual([
      { priority: 1, count: 2 },
      { priority: 3, count: 1 },
    ]);
  });

  it('returns an empty list when no jobs are prioritized', async () => {
    await queue.add('a', {});

    const res = await testBoard.request('get', '/api/queues/PrioritiesTest/priorities');

    expect(res.status).toBe(200);
    expect((res.body as { priorities: QueuePriorityCount[] }).priorities).toEqual([]);
  });

  it('returns 404 for an unknown queue', async () => {
    const res = await testBoard.request('get', '/api/queues/Unknown/priorities');
    expect(res.status).toBe(404);
  });
});
