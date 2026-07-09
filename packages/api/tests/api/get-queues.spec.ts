import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppQueue } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/queues', () => {
  let queue: Queue;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('GetQueuesTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    await testBoard?.close();
    testBoard = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  async function getQueues(queryString = ''): Promise<AppQueue[]> {
    if (!testBoard) {
      testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    }
    const res = await testBoard.request('get', `/api/queues${queryString}`);
    expect(res.status).toBe(200);
    return (res.body as { queues: AppQueue[] }).queues;
  }

  it('lists the queue with counts, statuses and is_paused', async () => {
    await queue.add('job-one', {});
    await queue.add('job-two', {}, { delay: 60_000 });

    const queues = await getQueues();

    expect(queues).toHaveLength(1);
    const appQueue = queues[0] as AppQueue;
    expect(appQueue.name).toBe('GetQueuesTest');
    expect(appQueue.counts.waiting).toBe(1);
    expect(appQueue.counts.delayed).toBe(1);
    expect(appQueue.is_paused).toBe(false);
    expect(appQueue.statuses).toContain('latest');
    expect(appQueue.read_only_mode).toBe(false);
    expect(appQueue.allow_retries).toBe(true);
  });

  it('returns jobs only for the active queue', async () => {
    await queue.add('visible-job', { payload: 1 });

    const inactive = await getQueues();
    expect((inactive[0] as AppQueue).jobs).toHaveLength(0);

    const active = await getQueues('?active_queue=GetQueuesTest');
    expect((active[0] as AppQueue).jobs).toHaveLength(1);
    expect((active[0] as AppQueue).jobs[0]?.name).toBe('visible-job');
  });

  it('filters jobs by status', async () => {
    await queue.add('waiting-job', {});
    await queue.add('delayed-job', {}, { delay: 60_000 });

    const delayedOnly = await getQueues('?active_queue=GetQueuesTest&status=delayed');
    const jobs = (delayedOnly[0] as AppQueue).jobs;

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.name).toBe('delayed-job');
  });

  it('paginates jobs with per_page', async () => {
    await Promise.all(
      Array.from({ length: 5 }, (_, index) => queue.add(`job-${index}`, { index })),
    );

    const pageOne = await getQueues('?active_queue=GetQueuesTest&status=waiting&page=1&per_page=2');
    const appQueue = pageOne[0] as AppQueue;

    expect(appQueue.jobs).toHaveLength(2);
    expect(appQueue.pagination.page_count).toBe(3);
  });

  it('searches jobs by name', async () => {
    await queue.add('send-email', {});
    await queue.add('resize-image', {});

    const found = await getQueues('?active_queue=GetQueuesTest&status=waiting&search=email');
    const jobs = (found[0] as AppQueue).jobs;

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.name).toBe('send-email');
  });

  it('orders jobs by sort direction', async () => {
    await queue.add('first', {});
    await queue.add('second', {});
    await queue.add('third', {});

    const asc = await getQueues('?active_queue=GetQueuesTest&status=waiting&sort=asc');
    const desc = await getQueues('?active_queue=GetQueuesTest&status=waiting&sort=desc');
    const ascIds = (asc[0] as AppQueue).jobs.map((job) => job.id);
    const descIds = (desc[0] as AppQueue).jobs.map((job) => job.id);

    expect(descIds).toEqual([...ascIds].reverse());
  });

  it('rejects an invalid status with 400', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const res = await testBoard.request('get', '/api/queues?status=bogus');
    expect(res.status).toBe(400);
  });
});
