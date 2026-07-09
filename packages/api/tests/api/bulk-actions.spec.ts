import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('POST /api/queues/:queueName/jobs/bulk', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('BulkTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('removes jobs in bulk', async () => {
    const jobs = await Promise.all([queue.add('a', {}), queue.add('b', {}), queue.add('c', {})]);

    const res = await testBoard.request('post', '/api/queues/BulkTest/jobs/bulk', {
      action: 'remove',
      job_ids: jobs.map((job) => job.id),
    });

    expect(res.status).toBe(204);
    expect(await queue.getWaitingCount()).toBe(0);
  });

  it('promotes delayed jobs in bulk', async () => {
    const jobs = await Promise.all([
      queue.add('a', {}, { delay: 60_000 }),
      queue.add('b', {}, { delay: 60_000 }),
    ]);

    const res = await testBoard.request('post', '/api/queues/BulkTest/jobs/bulk', {
      action: 'promote',
      job_ids: jobs.map((job) => job.id),
    });

    expect(res.status).toBe(204);
    expect(await queue.getDelayedCount()).toBe(0);
    expect(await queue.getWaitingCount()).toBe(2);
  });

  it('is all-or-nothing: one missing id fails the whole request', async () => {
    const jobs = await Promise.all([queue.add('a', {}), queue.add('b', {})]);

    const res = await testBoard.request('post', '/api/queues/BulkTest/jobs/bulk', {
      action: 'remove',
      job_ids: [...jobs.map((job) => job.id), '99999'],
    });

    expect(res.status).toBe(400);
    expect((res.body as { job_ids: string[] }).job_ids).toEqual(['99999']);
    expect(await queue.getWaitingCount()).toBe(2);
  });

  it('is all-or-nothing: an invalid state fails the whole request', async () => {
    const waiting = await queue.add('waiting-job', {});
    const delayed = await queue.add('delayed-job', {}, { delay: 60_000 });

    const res = await testBoard.request('post', '/api/queues/BulkTest/jobs/bulk', {
      action: 'promote',
      job_ids: [waiting.id, delayed.id],
    });

    expect(res.status).toBe(400);
    expect((res.body as { job_ids: string[] }).job_ids).toEqual([waiting.id]);
    expect(await queue.getDelayedCount()).toBe(1);
  });

  it('rejects an unknown action', async () => {
    const job = await queue.add('a', {});

    const res = await testBoard.request('post', '/api/queues/BulkTest/jobs/bulk', {
      action: 'obliterate',
      job_ids: [job.id],
    });

    expect(res.status).toBe(400);
  });
});
