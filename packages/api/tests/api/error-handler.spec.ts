import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('error handler', () => {
  let queue: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queue = new Queue('ErrorHandlerTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queue.close().catch(() => undefined);
  });

  it('maps a thrown adapter error to a structured 500', async () => {
    await queue.close();

    const res = await testBoard.request('get', '/api/queues');

    expect(res.status).toBe(500);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('internal server error');
    expect(body.message.length).toBeGreaterThan(0);
  });
});
