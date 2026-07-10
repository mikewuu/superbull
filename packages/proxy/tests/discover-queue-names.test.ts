import { Queue } from 'bullmq';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverQueueNames } from '../src/discover-queue-names';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('discoverQueueNames', () => {
  const queues: Queue[] = [];

  afterEach(async () => {
    for (const queue of queues.splice(0)) {
      await queue.obliterate({ force: true }).catch(() => undefined);
      await queue.close();
    }
  });

  async function seed(name: string, prefix?: string): Promise<Queue> {
    const queue = new Queue(name, { connection, prefix });
    await queue.waitUntilReady();
    await queue.add('seed', {});
    queues.push(queue);
    return queue;
  }

  it('discovers queue names under the default prefix', async () => {
    const suffix = `${process.pid}-${Date.now()}`;
    await seed(`discover-a-${suffix}`);
    await seed(`discover-b-${suffix}`);

    const names = await discoverQueueNames({ connection, prefix: 'bull' });

    expect(names).toContain(`discover-a-${suffix}`);
    expect(names).toContain(`discover-b-${suffix}`);
    expect(names).toEqual([...names].sort());
  });

  it('discovers queue names under a custom prefix only', async () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const customPrefix = `custom-${suffix}`;
    await seed(`discover-c-${suffix}`, customPrefix);
    await seed(`discover-d-${suffix}`);

    const names = await discoverQueueNames({ connection, prefix: customPrefix });

    expect(names).toEqual([`discover-c-${suffix}`]);
  });

  it('returns an empty list instead of hanging when redis is unreachable', async () => {
    const names = await discoverQueueNames({
      connection: { host: '127.0.0.1', port: 65100 },
      prefix: 'bull',
      timeoutMs: 500,
    });

    expect(names).toEqual([]);
  });
});
