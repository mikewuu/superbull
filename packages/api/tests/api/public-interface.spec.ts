import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppQueue } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('createBoard queue registry', () => {
  let queueA: Queue;
  let queueB: Queue;
  let testBoard: TestBoard;

  beforeEach(async () => {
    queueA = new Queue('RegistryTestA', { connection });
    queueB = new Queue('RegistryTestB', { connection });
    testBoard = await startTestBoard([new BullMQAdapter(queueA)]);
  });

  afterEach(async () => {
    await testBoard.close();
    await queueA.close();
    await queueB.close();
  });

  async function listQueueNames(): Promise<string[]> {
    const res = await testBoard.request('get', '/api/queues');
    return (res.body as { queues: AppQueue[] }).queues.map((appQueue) => appQueue.name);
  }

  it('serves the initially registered queues', async () => {
    expect(await listQueueNames()).toEqual(['RegistryTestA']);
  });

  it('addQueue exposes a new queue', async () => {
    testBoard.board.addQueue(new BullMQAdapter(queueB));
    expect(await listQueueNames()).toEqual(['RegistryTestA', 'RegistryTestB']);
  });

  it('removeQueue removes a queue by name', async () => {
    testBoard.board.removeQueue('RegistryTestA');
    expect(await listQueueNames()).toEqual([]);
  });

  it('replaceQueues swaps the registered queues', async () => {
    testBoard.board.replaceQueues([new BullMQAdapter(queueB)]);
    expect(await listQueueNames()).toEqual(['RegistryTestB']);
  });
});
