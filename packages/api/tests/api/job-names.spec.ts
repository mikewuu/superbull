import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { JobNameStats } from '../../src/handlers/get-queue-job-names';
import { BullMQAdapter } from '../../src/queue-adapters/bullmq-adapter';
import { type TestBoard, startTestBoard } from '../helpers/start-test-board';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('GET /api/queues/:queueName/job-names', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let testBoard: TestBoard | undefined;

  beforeEach(async () => {
    queue = new Queue('JobNamesTest', { connection });
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

  it('aggregates counts, failure rate and activity per job name', async () => {
    worker = new Worker(
      'JobNamesTest',
      async (job) => {
        if (job.data.fail) {
          throw new Error('boom');
        }
        return 'ok';
      },
      { connection },
    );

    await queue.addBulk([
      { name: 'send-email', data: {}, opts: { attempts: 1 } },
      { name: 'send-email', data: {}, opts: { attempts: 1 } },
      { name: 'send-email', data: { fail: true }, opts: { attempts: 1 } },
      { name: 'resize-image', data: {}, opts: { attempts: 1 } },
    ]);
    await waitForFinished(queue, 4);
    await queue.add('send-email', {}, { delay: 3_600_000 });

    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const response = await testBoard.request('get', '/api/queues/JobNamesTest/job-names');
    const body = response.body as { job_names: JobNameStats[] };

    expect(response.status).toBe(200);
    const sendEmail = body.job_names.find((entry) => entry.name === 'send-email');
    const resizeImage = body.job_names.find((entry) => entry.name === 'resize-image');
    if (!sendEmail || !resizeImage) {
      throw new Error('expected both job names in response');
    }

    expect(sendEmail.completed_count).toBe(2);
    expect(sendEmail.failed_count).toBe(1);
    expect(sendEmail.pending_count).toBe(1);
    expect(sendEmail.failure_rate).toBeCloseTo(1 / 3);
    expect(sendEmail.activity[0]).toBe(3);
    expect(sendEmail.avg_duration_ms).not.toBeNull();

    expect(resizeImage.completed_count).toBe(1);
    expect(resizeImage.failed_count).toBe(0);
    expect(resizeImage.failure_rate).toBe(0);
  });

  it('404s for an unknown queue', async () => {
    testBoard = await startTestBoard([new BullMQAdapter(queue)]);
    const response = await testBoard.request('get', '/api/queues/nope/job-names');
    expect(response.status).toBe(404);
  });
});

async function waitForFinished(queue: Queue, expected: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const counts = await queue.getJobCounts('completed', 'failed');
    if ((counts.completed ?? 0) + (counts.failed ?? 0) >= expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('jobs did not finish in time');
}
