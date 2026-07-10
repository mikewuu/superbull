import { Redis } from 'ioredis';

export interface DiscoverQueueNamesArgs {
  connection: {
    host: string;
    port: number;
    password?: string | undefined;
    db?: number | undefined;
    tls?: boolean | undefined;
  };
  prefix: string;
  timeoutMs?: number;
}

export async function discoverQueueNames(args: DiscoverQueueNamesArgs): Promise<string[]> {
  const { connection, prefix, timeoutMs = 10_000 } = args;
  const redis = new Redis({
    host: connection.host,
    port: connection.port,
    password: connection.password,
    db: connection.db,
    tls: connection.tls ? {} : undefined,
    lazyConnect: true,
    connectTimeout: timeoutMs,
  });
  redis.on('error', () => undefined);

  const timeoutPromise = new Promise<string[]>((resolve) => {
    setTimeout(() => resolve([]), timeoutMs);
  });

  try {
    return await Promise.race([scanForQueueNames(redis, prefix), timeoutPromise]);
  } finally {
    redis.disconnect();
  }
}

async function scanForQueueNames(redis: Redis, prefix: string): Promise<string[]> {
  try {
    await redis.connect();
  } catch {
    return [];
  }

  const names = new Set<string>();
  const pattern = `${prefix}:*:meta`;
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
}

function extractQueueName(key: string, prefix: string): string | null {
  const body = key.slice(prefix.length + 1);
  const end = body.lastIndexOf(':meta');
  if (end === -1) {
    return null;
  }
  return body.slice(0, end);
}
