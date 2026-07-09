import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppQueue } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('pause and resume a queue', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('PauseResumeTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('pauses the queue and reflects it in the queue list', async () => {
    const res = await testBoard.request('put', '/api/queues/PauseResumeTest/pause');
    expect(res.status).toBe(204);
    expect(await queue.isPaused()).toBe(true);

    const listRes = await testBoard.request('get', '/api/queues');
    const queues = (listRes.body as { queues: AppQueue[] }).queues;
    expect(queues[0]?.is_paused).toBe(true);
  });

  it('resumes a paused queue', async () => {
    await queue.pause();

    const res = await testBoard.request('put', '/api/queues/PauseResumeTest/resume');

    expect(res.status).toBe(204);
    expect(await queue.isPaused()).toBe(false);
  });

  it('returns 404 for an unknown queue', async () => {
    const res = await testBoard.request('put', '/api/queues/Unknown/pause');
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBe('queue not found');
  });
});
