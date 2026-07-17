import { env } from '../config/env';
import { connectRedis } from '../redis/connect-redis';

let reportedUnreachable = false;

/**
 * Fixed-window request counter shared by REST and MCP (one window across both
 * surfaces). Today the whole deployment authenticates as the single
 * SUPERBULL_API_TOKEN principal ('hub'), so that is the id; when
 * per-workspace API keys land (TODO 7.2e in api/mcp/route.ts) the id becomes
 * the workspace. Fails open when redis is unreachable — rate limiting is
 * overload protection, not auth.
 */
export async function isWithinRateLimit(id: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60_000);
  const key = `api-rate:${id}:${window}`;

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
