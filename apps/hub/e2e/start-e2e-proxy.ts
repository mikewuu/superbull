import { BullMQAdapter } from '@bullwatch/api';
import { startProxy } from '@bullwatch/proxy';
import { type Job, Queue, Worker } from 'bullmq';

const connection = { host: '127.0.0.1', port: Number(process.env.REDIS_PORT ?? 6379) };
const queueName = 'hub-e2e';

async function main(): Promise<void> {
  const queue = new Queue(queueName, { connection });
  await queue.obliterate({ force: true }).catch(() => undefined);
  await queue.resume().catch(() => undefined);

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      if (job.data.fail) {
        throw new Error(`seed failure for ${job.name}`);
      }
      return { ok: true };
    },
    { connection, concurrency: 5 },
  );

  await queue.addBulk(
    Array.from({ length: 5 }, (_, index) => ({
      name: 'seed-completed',
      data: {},
      opts: { attempts: 1, jobId: `completed-${index}` },
    })),
  );
  await waitForDrain(queue);

  await queue.addBulk(
    Array.from({ length: 2 }, (_, index) => ({
      name: 'seed-failed',
      data: { fail: true },
      opts: { attempts: 1, jobId: `failed-${index}` },
    })),
  );
  await waitForDrain(queue);

  await worker.close();

  await queue.addBulk(
    Array.from({ length: 3 }, (_, index) => ({
      name: 'seed-waiting',
      data: {},
      opts: { jobId: `waiting-${index}` },
    })),
  );

  const proxy = await startProxy({
    queues: [new BullMQAdapter(queue)],
    token: 'e2e-proxy-token',
    port: 4655,
  });

  console.log(`e2e proxy ready on ${proxy.port}: 5 completed, 2 failed, 3 waiting`);
}

async function waitForDrain(queue: Queue): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const counts = await queue.getJobCounts('waiting', 'active', 'prioritized');
    const pending = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.prioritized ?? 0);
    if (pending === 0) {
      return;
    }
    await sleep(100);
  }
  throw new Error(`queue ${queue.name} did not drain in time`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
