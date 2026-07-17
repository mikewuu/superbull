import { env } from '../config/env';
import { connectRedis } from '../redis/connect-redis';

let reportedUnreachable = false;

// The whole deployment authenticates as the single SUPERBULL_API_TOKEN
// principal, so there is exactly one window to meter.
const principalId = 'hub';

/**
 * Fails open when redis is unreachable — rate limiting is overload
 * protection, not auth.
 */
export async function isWithinRateLimit(): Promise<boolean> {
  const window = Math.floor(Date.now() / 60_000);
  const key = `api-rate:${principalId}:${window}`;

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
