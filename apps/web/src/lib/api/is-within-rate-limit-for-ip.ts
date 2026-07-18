import { env } from '../config/env';
import { connectRedis } from '../redis/connect-redis';

let reportedUnreachable = false;

export async function isWithinRateLimitForIp(ip: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60_000);
  const key = `oauth-rate:${ip}:${window}`;

  try {
    const redis = await connectRedis();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60);
    }
    reportedUnreachable = false;
    return count <= env.RATE_LIMIT_PER_MINUTE;
  } catch (error) {
    if (!reportedUnreachable) {
      reportedUnreachable = true;
      console.error('[rate-limit] redis unreachable — failing open', error);
    }
    return true;
  }
}
