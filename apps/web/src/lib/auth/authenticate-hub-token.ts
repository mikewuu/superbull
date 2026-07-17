import { timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { isWithinRateLimit } from '../api/is-within-rate-limit';
import { secondsUntilRateLimitReset } from '../api/seconds-until-rate-limit-reset';
import { env } from '../config/env';

export function isValidHubToken(bearerToken: string): boolean {
  const token = env.SUPERBULL_API_TOKEN;
  if (!token) {
    return false;
  }
  return (
    bearerToken.length === token.length &&
    timingSafeEqual(Buffer.from(bearerToken), Buffer.from(token))
  );
}

export async function authenticateHubToken<TReq extends { headers: Headers }>(
  req: TReq,
): Promise<TReq | NextResponse> {
  const token = env.SUPERBULL_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'SUPERBULL_API_TOKEN is not configured' }, { status: 500 });
  }

  const header = req.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

  if (!isValidHubToken(presented)) {
    throw new UnauthorizedException();
  }

  // One fixed window shared with MCP, keyed by the deployment's single
  // authenticated principal until per-workspace keys land.
  if (!(await isWithinRateLimit('hub'))) {
    return NextResponse.json(
      {
        type: 'rate_limited',
        message: `Rate limit exceeded (${env.RATE_LIMIT_PER_MINUTE} requests/minute). Retry shortly.`,
      },
      {
        status: 429,
        headers: { 'retry-after': String(secondsUntilRateLimitReset()) },
      },
    );
  }

  return req;
}
