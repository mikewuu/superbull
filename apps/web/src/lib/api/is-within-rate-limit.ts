import { env } from '../config/env';
import { connectRedis } from '../redis/connect-redis';

let reportedUnreachable = false;

/**
 * Fails open when redis is unreachable — rate limiting is overload
 * protection, not auth.
 */
export async function isWithinRateLimit(userId: string): Promise<boolean> {
  return await isWithinRateLimitForKey(`api-rate:${userId}`);
}

export async function rateLimitByIp(ip: string): Promise<boolean> {
  return await isWithinRateLimitForKey(`oauth-rate:${ip}`);
}

async function isWithinRateLimitForKey(principalKey: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60_000);
  const key = `${principalKey}:${window}`;

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
