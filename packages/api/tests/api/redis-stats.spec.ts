import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/redis/stats', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('RedisStatsTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('returns parsed redis stats', async () => {
    const res = await testBoard.request('get', '/api/redis/stats');

    expect(res.status).toBe(200);
    const body = res.body as {
      version: string;
      uptime: number;
      memory: { used: number };
      clients: { connected: number };
    };
    expect(body.version).toMatch(/^\d+\./);
    expect(body.uptime).toBeGreaterThan(0);
    expect(body.memory.used).toBeGreaterThan(0);
    expect(body.clients.connected).toBeGreaterThan(0);
  });
});
