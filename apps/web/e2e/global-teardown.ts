import { existsSync, renameSync } from 'node:fs';
import { Queue } from 'bullmq';

export default async function globalTeardown(): Promise<void> {
  if (existsSync('.env.local.e2e-stash')) {
    renameSync('.env.local.e2e-stash', '.env.local');
  }

  const connection = {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
  };
  const queue = new Queue('hub-e2e', { connection });
  await queue.obliterate({ force: true }).catch(() => undefined);
  await queue.close();
}
