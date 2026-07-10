import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/prometheus', () => {
  let queueA: Queue;
  let queueB: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queueA = new Queue('PrometheusTestA', { connection });
    queueB = new Queue('PrometheusTestB', { connection });
    await queueA.obliterate({ force: true }).catch(() => undefined);
    await queueB.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queueA), new BullMQAdapter(queueB)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queueA.obliterate({ force: true }).catch(() => undefined);
    await queueB.obliterate({ force: true }).catch(() => undefined);
    await queueA.close();
    await queueB.close();
  });

  it('returns text/plain prometheus exposition for every registered queue', async () => {
    await queueA.add('a', {});
    await queueB.add('b', {});

    const res = await testBoard.request('get', '/api/prometheus');

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('string');
    const text = res.body as string;
    expect(text).toContain('PrometheusTestA');
    expect(text).toContain('PrometheusTestB');
  });
});
