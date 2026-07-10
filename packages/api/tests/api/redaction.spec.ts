import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import type { AppJob, AppQueue } from '../../src/types';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

const secret = '123-45-6789';

describe('redaction hooks', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('RedactionTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    await testBoard?.close();
    testBoard = undefined;
    await worker?.close();
    worker = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  async function startRedactingBoard(): Promise<TestBoard> {
    const adapter = new BullMQAdapter(queue, {
      format: (field, value) =>
        field === 'data' || field === 'return_value' ? '[redacted]' : value,
    });
    return startTestBoard([adapter]);
  }

  it('redacts job data from GET /api/queues', async () => {
    await queue.add('secret', { ssn: secret });
    testBoard = await startRedactingBoard();

    const res = await testBoard.request('get', '/api/queues?active_queue=RedactionTest');
    const appQueue = (res.body as { queues: AppQueue[] }).queues[0];

    expect(appQueue?.jobs[0]?.data).toBe('[redacted]');
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });

  it('redacts job data and return_value from GET /api/queues/:queueName/:jobId', async () => {
    worker = new Worker('RedactionTest', async () => ({ ssn: secret }), { connection });
    const job = await queue.add('secret', { ssn: secret });
    await waitForCompleted(queue, job.id as string);
    testBoard = await startRedactingBoard();

    const res = await testBoard.request('get', `/api/queues/RedactionTest/${job.id}`);
    const body = res.body as { job: AppJob };

    expect(body.job.data).toBe('[redacted]');
    expect(body.job.return_value).toBe('[redacted]');
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });

  it('never serializes job payloads through the job-names endpoint', async () => {
    await queue.add('secret', { ssn: secret });
    testBoard = await startRedactingBoard();

    const res = await testBoard.request('get', '/api/queues/RedactionTest/job-names');

    expect(JSON.stringify(res.body)).not.toContain(secret);
  });
});

async function waitForCompleted(queue: Queue, jobId: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const job = await queue.getJob(jobId);
    if ((await job?.getState()) === 'completed') {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('job did not complete in time');
}
