import Redis from 'ioredis';
import { env } from '../config/env';

// One ioredis client per process so REST and MCP rate limiting share a
// connection. Fail fast so the limiter's fail-open path answers within a
// request budget instead of queueing commands while redis is down.
let redisPromise: Promise<Redis> | undefined;

export const connectRedis = (): Promise<Redis> => {
  redisPromise ??= createRedis();
  return redisPromise;
};

const createRedis = async (): Promise<Redis> => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1_000,
  });
};
