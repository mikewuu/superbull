import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppQueue } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const host = process.env.REDIS_HOST || 'localhost';
const port = Number(process.env.REDIS_PORT || 6379);

describe('one board across two redis databases on the same instance', () => {
  let queueDb0: Queue;
  let queueDb1: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queueDb0 = new Queue('MultiRedisTest', { connection: { host, port, db: 0 } });
    queueDb1 = new Queue('MultiRedisTest', { connection: { host, port, db: 1 } });
    await queueDb0.obliterate({ force: true }).catch(() => undefined);
    await queueDb1.obliterate({ force: true }).catch(() => undefined);

    testBoard = await startTestBoard([
      new BullMQAdapter(queueDb0, { prefix: 'db0-' }),
      new BullMQAdapter(queueDb1, { prefix: 'db1-' }),
    ]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queueDb0.obliterate({ force: true }).catch(() => undefined);
    await queueDb1.obliterate({ force: true }).catch(() => undefined);
    await queueDb0.close();
    await queueDb1.close();
  });

  it('lists queues registered from both redis databases', async () => {
    await queueDb0.add('from-db0', {});
    await queueDb1.add('from-db1', {});

    const res = await testBoard.request('get', '/api/queues');
    const names = (res.body as { queues: AppQueue[] }).queues.map((q) => q.name).sort();

    expect(names).toEqual(['db0-MultiRedisTest', 'db1-MultiRedisTest']);
  });

  it('routes a queue action to the matching redis instance only', async () => {
    await queueDb0.add('a', {});
    await queueDb1.add('b', {});

    const res = await testBoard.request('put', '/api/queues/db0-MultiRedisTest/pause');

    expect(res.status).toBe(204);
    expect(await queueDb0.isPaused()).toBe(true);
    expect(await queueDb1.isPaused()).toBe(false);
  });
});
