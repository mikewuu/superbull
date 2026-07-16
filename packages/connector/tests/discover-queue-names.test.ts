import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { discoverQueueNames } from '../src/discover-queue-names';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

// Mirrors how cli.ts wires things up: one shared IORedis client used for
// both discovery and BullMQ Queue instances.
const redis = new Redis({ ...connection, maxRetriesPerRequest: null });

describe('discoverQueueNames', () => {
  const queues: Queue[] = [];

  afterEach(async () => {
    for (const queue of queues.splice(0)) {
      await queue.obliterate({ force: true }).catch(() => undefined);
      await queue.close();
    }
  });

  afterAll(async () => {
    redis.disconnect();
  });

  async function seed(name: string, prefix?: string): Promise<Queue> {
    const queue = new Queue(name, { connection, prefix });
    await queue.waitUntilReady();
    await queue.add('seed', {});
    queues.push(queue);
    return queue;
  }

  it('discovers queue names under the default prefix using the shared connection', async () => {
    const suffix = `${process.pid}-${Date.now()}`;
    await seed(`discover-a-${suffix}`);
    await seed(`discover-b-${suffix}`);

    const names = await discoverQueueNames({ redis, prefix: 'bull' });

    expect(names).toContain(`discover-a-${suffix}`);
    expect(names).toContain(`discover-b-${suffix}`);
    expect(names).toEqual([...names].sort());
  });

  it('discovers queue names under a custom prefix only', async () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const customPrefix = `custom-${suffix}`;
    await seed(`discover-c-${suffix}`, customPrefix);
    await seed(`discover-d-${suffix}`);

    const names = await discoverQueueNames({ redis, prefix: customPrefix });

    expect(names).toEqual([`discover-c-${suffix}`]);
  });

  it('resolves via the timeout race instead of hanging when scan stalls', async () => {
    const staleRedis = { scan: () => new Promise(() => undefined) } as unknown as Redis;

    const names = await discoverQueueNames({ redis: staleRedis, prefix: 'bull', timeoutMs: 200 });

    expect(names).toEqual([]);
  });
});
