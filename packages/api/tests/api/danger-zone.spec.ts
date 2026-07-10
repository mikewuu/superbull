import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('danger zone: drain and obliterate', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('DangerZoneTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('drains waiting and delayed jobs, keeping the queue registered', async () => {
    await queue.add('a', {});
    await queue.add('b', {}, { delay: 60_000 });

    const res = await testBoard.request('put', '/api/queues/DangerZoneTest/drain');

    expect(res.status).toBe(204);
    expect(await queue.getWaitingCount()).toBe(0);
    expect(await queue.getDelayedCount()).toBe(0);
  });

  it('returns 404 draining an unknown queue', async () => {
    const res = await testBoard.request('put', '/api/queues/Unknown/drain');
    expect(res.status).toBe(404);
  });

  it('obliterates the queue, leaving it usable afterward', async () => {
    await queue.add('a', {});

    const res = await testBoard.request('put', '/api/queues/DangerZoneTest/obliterate');

    expect(res.status).toBe(204);
    expect(await queue.getWaitingCount()).toBe(0);

    await queue.add('again', {});
    expect(await queue.getWaitingCount()).toBe(1);
  });

  it('returns 404 obliterating an unknown queue', async () => {
    const res = await testBoard.request('put', '/api/queues/Unknown/obliterate');
    expect(res.status).toBe(404);
  });
});
