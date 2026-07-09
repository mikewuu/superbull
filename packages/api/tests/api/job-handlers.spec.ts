import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('job and queue handlers', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('HandlersTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('promotes all delayed jobs', async () => {
    await queue.add('a', {}, { delay: 60_000 });
    await queue.add('b', {}, { delay: 60_000 });
    expect(await queue.getDelayedCount()).toBe(2);

    const res = await testBoard.request('put', '/api/queues/HandlersTest/promote');

    expect(res.status).toBe(204);
    expect(await queue.getDelayedCount()).toBe(0);
  });

  it('promotes a single delayed job', async () => {
    const job = await queue.add('solo', {}, { delay: 60_000 });

    const res = await testBoard.request('put', `/api/queues/HandlersTest/${job.id}/promote`);

    expect(res.status).toBe(204);
    expect(await queue.getDelayedCount()).toBe(0);
  });

  it('cleans a given status, retaining jobs within the grace window', async () => {
    await queue.add('d', {}, { delay: 60_000 });
    expect(await queue.getDelayedCount()).toBe(1);

    // The handler's 5s grace retains this just-added job.
    const res = await testBoard.request('put', '/api/queues/HandlersTest/clean/delayed');

    expect(res.status).toBe(204);
    expect(await queue.getDelayedCount()).toBe(1);
  });

  it('rejects cleaning an unknown status', async () => {
    const res = await testBoard.request('put', '/api/queues/HandlersTest/clean/bogus');
    expect(res.status).toBe(400);
  });

  it("updates a job's data", async () => {
    const job = await queue.add('editable', { value: 'before' });

    const res = await testBoard.request('patch', `/api/queues/HandlersTest/${job.id}/update-data`, {
      data: { value: 'after' },
    });

    expect(res.status).toBe(204);
    const updated = await queue.getJob(job.id as string);
    expect(updated?.data).toEqual({ value: 'after' });
  });

  it("returns a job's logs", async () => {
    const job = await queue.add('logged', {});
    await queue.addJobLog(job.id as string, 'first line');

    const res = await testBoard.request('get', `/api/queues/HandlersTest/${job.id}/logs`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ logs: ['first line'] });
  });

  it('removes a job via the clean action', async () => {
    const job = await queue.add('removable', {});

    const res = await testBoard.request('put', `/api/queues/HandlersTest/${job.id}/clean`);

    expect(res.status).toBe(204);
    expect(await queue.getJob(job.id as string)).toBeUndefined();
  });

  it('returns a single job with its status', async () => {
    const job = await queue.add('inspected', { key: 'value' });

    const res = await testBoard.request('get', `/api/queues/HandlersTest/${job.id}`);

    expect(res.status).toBe(200);
    const body = res.body as { job: { id: string; data: unknown }; status: string };
    expect(body.job.id).toBe(job.id);
    expect(body.job.data).toEqual({ key: 'value' });
    expect(body.status).toBe('waiting');
  });

  it('returns 404 for a missing job', async () => {
    const res = await testBoard.request('get', '/api/queues/HandlersTest/99999');
    expect(res.status).toBe(404);
  });

  it('empties the queue', async () => {
    await queue.add('a', {});
    await queue.add('b', {});

    const res = await testBoard.request('put', '/api/queues/HandlersTest/empty');

    expect(res.status).toBe(204);
    expect(await queue.getWaitingCount()).toBe(0);
  });
});
