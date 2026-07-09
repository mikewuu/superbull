import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppQueue } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('queues with the same name but a different prefix', () => {
  let emailsTenantA: Queue;
  let emailsTenantB: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    emailsTenantA = new Queue('emails', { connection, prefix: 'tenant-a' });
    emailsTenantB = new Queue('emails', { connection, prefix: 'tenant-b' });
    testBoard = await startTestBoard([
      new BullMQAdapter(emailsTenantA, { prefix: 'tenant-a:' }),
      new BullMQAdapter(emailsTenantB, { prefix: 'tenant-b:' }),
    ]);
  });

  afterEach(async () => {
    await testBoard.close();
    await emailsTenantA.obliterate({ force: true }).catch(() => undefined);
    await emailsTenantB.obliterate({ force: true }).catch(() => undefined);
    await emailsTenantA.close();
    await emailsTenantB.close();
  });

  it('keeps both queues as distinct board entries', async () => {
    const res = await testBoard.request('get', '/api/queues');

    expect(res.status).toBe(200);
    const names = (res.body as { queues: AppQueue[] }).queues
      .map((appQueue) => appQueue.name)
      .sort();
    expect(names).toEqual(['tenant-a:emails', 'tenant-b:emails']);
  });
});
