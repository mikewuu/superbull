import type { Redis } from 'ioredis';

export interface DiscoverQueueNamesArgs {
  /**
   * The single shared IORedis command connection — the same client used for
   * BullMQ Queue instances and mutations. Discovery does not open its own
   * throwaway connection; that lifecycle is owned by the caller (cli.ts).
   */
  redis: Redis;
  prefix: string;
  timeoutMs?: number;
}

export async function discoverQueueNames(args: DiscoverQueueNamesArgs): Promise<string[]> {
  const { redis, prefix, timeoutMs = 10_000 } = args;
  const names = new Set<string>();
  const pattern = `${prefix}:*:meta`;

  const scanPromise = (async (): Promise<string[]> => {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      for (const key of keys) {
        const name = extractQueueName(key, prefix);
        if (name) {
          names.add(name);
        }
      }
    } while (cursor !== '0');
    return Array.from(names).sort();
  })();

  const timeoutPromise = new Promise<string[]>((resolve) => {
    setTimeout(() => resolve(Array.from(names).sort()), timeoutMs);
  });

  return Promise.race([scanPromise, timeoutPromise]);
}

function extractQueueName(key: string, prefix: string): string | null {
  const body = key.slice(prefix.length + 1);
  const end = body.lastIndexOf(':meta');
  if (end === -1) {
    return null;
  }
  return body.slice(0, end);
}
