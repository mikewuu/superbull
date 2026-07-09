import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('PUT /api/queues/:queueName/retry/:status', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('RetryAllTest', { connection });
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

  async function failJobs(count: number): Promise<string[]> {
    const jobs = await Promise.all(
      Array.from({ length: count }, (_, index) => queue.add(`job-${index}`, { index })),
    );

    const failingWorker = new Worker(
      'RetryAllTest',
      async (): Promise<void> => {
        throw new Error('deliberate failure');
      },
      { connection },
    );
    worker = failingWorker;
    let failedCount = 0;
    await new Promise<void>((resolve) => {
      failingWorker.on('failed', () => {
        failedCount++;
        if (failedCount >= count) {
          resolve();
        }
      });
    });
    await failingWorker.close();
    worker = undefined;

    return jobs.map((job) => job.id as string);
  }

  it('retries all failed jobs', async () => {
    const jobIds = await failJobs(3);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);

    const res = await testBoard.request('put', '/api/queues/RetryAllTest/retry/failed');

    expect(res.status).toBe(204);
    for (const jobId of jobIds) {
      const job = await queue.getJob(jobId);
      expect(await job?.getState()).toBe('waiting');
    }
  });

  it('returns 400 for a non-retriable status', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);

    const res = await testBoard.request('put', '/api/queues/RetryAllTest/retry/active');

    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain('not a retriable status');
  });

  it('returns 405 in read-only mode', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue, { readOnlyMode: true })]);

    const res = await testBoard.request('put', '/api/queues/RetryAllTest/retry/failed');

    expect(res.status).toBe(405);
  });
});
