import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('POST /api/queues/:queueName/add', () => {
  let queue: Queue;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('AddJobTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    await testBoard?.close();
    testBoard = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('adds a job and returns the created job', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);

    const res = await testBoard.request('post', '/api/queues/AddJobTest/add', {
      name: 'manual-job',
      data: { source: 'test' },
      options: null,
    });

    expect(res.status).toBe(201);
    const body = res.body as { job: { id: string; name: string }; status: string };
    expect(body.job.name).toBe('manual-job');
    expect(body.status).toBe('waiting');
    const job = await queue.getJob(body.job.id);
    expect(job?.data).toEqual({ source: 'test' });
  });

  it('adds a delayed job when options include a delay', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);

    const res = await testBoard.request('post', '/api/queues/AddJobTest/add', {
      name: 'later-job',
      data: {},
      options: { delay: 60_000 },
    });

    expect(res.status).toBe(201);
    expect((res.body as { status: string }).status).toBe('delayed');
  });

  it('rejects a body without a name', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);

    const res = await testBoard.request('post', '/api/queues/AddJobTest/add', {
      data: {},
      options: null,
    });

    expect(res.status).toBe(400);
  });

  it('returns 405 in read-only mode', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue, { readOnlyMode: true })]);

    const res = await testBoard.request('post', '/api/queues/AddJobTest/add', {
      name: 'blocked-job',
      data: {},
      options: null,
    });

    expect(res.status).toBe(405);
  });
});
