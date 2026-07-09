import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('PUT /api/queues/:queueName/:jobId/retry', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('RetryJobTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await worker?.close();
    worker = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  async function failOneJob(): Promise<string> {
    const job = await queue.add('doomed', {});
    const failingWorker = new Worker(
      'RetryJobTest',
      async (): Promise<void> => {
        throw new Error('deliberate failure');
      },
      { connection },
    );
    worker = failingWorker;
    await new Promise<void>((resolve) => {
      failingWorker.on('failed', () => resolve());
    });
    await failingWorker.close();
    worker = undefined;
    return job.id as string;
  }

  it('retries a failed job back to waiting', async () => {
    const jobId = await failOneJob();
    expect(await queue.getFailedCount()).toBe(1);

    const res = await testBoard.request('put', `/api/queues/RetryJobTest/${jobId}/retry`);

    expect(res.status).toBe(204);
    const job = await queue.getJob(jobId);
    expect(await job?.getState()).toBe('waiting');
  });

  it('rejects retrying a waiting job with 400', async () => {
    const job = await queue.add('fresh', {});

    const res = await testBoard.request('put', `/api/queues/RetryJobTest/${job.id}/retry`);

    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain('cannot be retried');
  });

  it('returns 404 for a missing job', async () => {
    const res = await testBoard.request('put', '/api/queues/RetryJobTest/99999/retry');
    expect(res.status).toBe(404);
  });
});
