import { timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { env } from '../config/env';

export function authenticateHubToken<TReq extends { headers: Headers }>(
  req: TReq,
): TReq | NextResponse {
  const token = env.HUB_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'HUB_API_TOKEN is not configured' }, { status: 500 });
  }

  const header = req.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const authorized =
    presented.length === token.length &&
    timingSafeEqual(Buffer.from(presented), Buffer.from(token));

  if (!authorized) {
    throw new UnauthorizedException();
  }

  return req;
}
