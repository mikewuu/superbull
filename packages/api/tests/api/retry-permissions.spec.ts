import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { QueueAdapterOptions } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('retry permissions', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('RetryPermissionsTest', { connection });
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

  async function startBoard(options: Partial<QueueAdapterOptions>): Promise<TestBoard> {
    testBoard = await startTestBoard([new BullMQAdapter(queue, options)]);
    return testBoard;
  }

  async function runOneJob(outcome: 'failed' | 'completed'): Promise<string> {
    const job = await queue.add('permission-job', {});
    const runningWorker = new Worker(
      'RetryPermissionsTest',
      async (): Promise<void> => {
        if (outcome === 'failed') {
          throw new Error('deliberate failure');
        }
      },
      { connection },
    );
    worker = runningWorker;
    await new Promise<void>((resolve) => {
      runningWorker.on(outcome, () => resolve());
    });
    await runningWorker.close();
    worker = undefined;
    return job.id as string;
  }

  it('exposes the flags on /api/queues', async () => {
    const board = await startBoard({ allowRetries: false });
    const res = await board.request('get', '/api/queues');
    const body = res.body as {
      queues: { allow_retries: boolean; allow_completed_retries: boolean }[];
    };
    expect(body.queues[0]?.allow_retries).toBe(false);
    expect(body.queues[0]?.allow_completed_retries).toBe(false);
  });

  it('rejects a single retry with 405 when retries are disabled', async () => {
    const board = await startBoard({ allowRetries: false });
    const jobId = await runOneJob('failed');

    const res = await board.request('put', `/api/queues/RetryPermissionsTest/${jobId}/retry`);

    expect(res.status).toBe(405);
    expect(await queue.getFailedCount()).toBe(1);
  });

  it('rejects retry-all with 405 when retries are disabled', async () => {
    const board = await startBoard({ allowRetries: false });
    await runOneJob('failed');

    const res = await board.request('put', '/api/queues/RetryPermissionsTest/retry/failed');

    expect(res.status).toBe(405);
    expect(await queue.getFailedCount()).toBe(1);
  });

  it('rejects a bulk retry with 405 when retries are disabled', async () => {
    const board = await startBoard({ allowRetries: false });
    const jobId = await runOneJob('failed');

    const res = await board.request('post', '/api/queues/RetryPermissionsTest/jobs/bulk', {
      action: 'retry',
      job_ids: [jobId],
    });

    expect(res.status).toBe(405);
    expect(await queue.getFailedCount()).toBe(1);
  });

  it('rejects retrying a completed job with 405 when completed retries are disabled', async () => {
    const board = await startBoard({ allowCompletedRetries: false });
    const jobId = await runOneJob('completed');

    const res = await board.request('put', `/api/queues/RetryPermissionsTest/${jobId}/retry`);

    expect(res.status).toBe(405);
    expect(await queue.getCompletedCount()).toBe(1);
  });

  it('still retries a failed job when only completed retries are disabled', async () => {
    const board = await startBoard({ allowCompletedRetries: false });
    const jobId = await runOneJob('failed');

    const res = await board.request('put', `/api/queues/RetryPermissionsTest/${jobId}/retry`);

    expect(res.status).toBe(204);
    const job = await queue.getJob(jobId);
    expect(await job?.getState()).toBe('waiting');
  });

  it('flags completed jobs as invalid in a bulk retry when completed retries are disabled', async () => {
    const board = await startBoard({ allowCompletedRetries: false });
    const jobId = await runOneJob('completed');

    const res = await board.request('post', '/api/queues/RetryPermissionsTest/jobs/bulk', {
      action: 'retry',
      job_ids: [jobId],
    });

    expect(res.status).toBe(400);
    expect((res.body as { job_ids: string[] }).job_ids).toEqual([jobId]);
    expect(await queue.getCompletedCount()).toBe(1);
  });
});
