import { NextResponse } from 'next/server';
import { isWithinRateLimit } from '../api/is-within-rate-limit';
import { secondsUntilRateLimitReset } from '../api/seconds-until-rate-limit-reset';
import { env } from '../config/env';
import { findCaller } from './find-caller';

export async function authenticateCaller<TRequest extends { headers: Headers }>(
  request: TRequest,
): Promise<(TRequest & { userId: string; projectId: string | null }) | NextResponse> {
  const authorization = request.headers.get('authorization') ?? '';
  const rawToken = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
  const caller = await findCaller(rawToken);
  if (!caller) {
    return NextResponse.json({ type: 'unauthorized', message: 'Unauthorized.' }, { status: 401 });
  }

  if (!(await isWithinRateLimit(caller.userId))) {
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

  return {
    ...request,
    userId: caller.userId,
    projectId: caller.projectId ? String(caller.projectId) : null,
  };
}
