import { BullMQAdapter, createBoard } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import { Queue } from 'bullmq';
import express from 'express';
import IORedis from 'ioredis';

const host = process.env.REDIS_HOST ?? '127.0.0.1';
const port = Number(process.env.REDIS_PORT ?? 6379);
const httpPort = Number(process.env.PORT ?? 3333);
const connection = { host, port };

async function findQueueNames(): Promise<string[]> {
  const redis = new IORedis({ host, port, maxRetriesPerRequest: null });
  const names = new Set<string>();
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'bull:*:meta', 'COUNT', 200);
    cursor = next;
    for (const key of keys) {
      const match = key.match(/^bull:(.+):meta$/);
      if (match?.[1]) {
        names.add(match[1]);
      }
    }
  } while (cursor !== '0');
  await redis.quit();
  return [...names].sort();
}

async function main() {
  const configured = process.env.QUEUES?.split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const queueNames = configured ?? (await findQueueNames());

  const queues = queueNames.map((name) => new BullMQAdapter(new Queue(name, { connection })));

  const serverAdapter = new ExpressAdapter();
  createBoard({ queues, serverAdapter });

  const app = express();
  app.use('/', serverAdapter.getRouter());

  app.listen(httpPort, () => {
    const label = queueNames.length > 0 ? queueNames.join(', ') : 'none discovered';
    console.log(`superbull dev → http://localhost:${httpPort}`);
    console.log(`redis ${host}:${port} · queues: ${label}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
