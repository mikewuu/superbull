import type { RedisOptions } from 'ioredis';

export interface RedisConnectionConfig {
  redisHost: string;
  redisPort: number;
  redisPassword?: string | undefined;
  redisDb?: number | undefined;
  redisTls?: boolean | undefined;
}

/**
 * Builds plain ioredis connection options (host/port/auth/tls) from CLI
 * config. Used both to construct the single shared command connection (for
 * discovery, BullMQ Queue instances, and mutations) and to construct the
 * per-queue QueueEvents blocking connections, which each need their own
 * connection options rather than a shared client instance.
 */
export function buildRedisConnectionOptions(config: RedisConnectionConfig): RedisOptions {
  return {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    db: config.redisDb,
    tls: config.redisTls ? {} : undefined,
  };
}
