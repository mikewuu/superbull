import { NextResponse } from 'next/server';
import { api } from '../../../../../convex/_generated/api';
import { isWithinRateLimitForIp } from '../../../../lib/api/is-within-rate-limit-for-ip';
import { hashToken } from '../../../../lib/auth/hash-token';
import { createServerConvexClient } from '../../../../lib/convex/create-server-convex-client';
import { getClientIp } from '../../../oauth/get-client-ip';

export const runtime = 'nodejs';

const oauthCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!(await isWithinRateLimitForIp(ip))) {
    return NextResponse.json({ error: 'slow_down' }, { status: 429, headers: oauthCorsHeaders });
  }

  const params = new URLSearchParams(await request.text());
  const rawToken = params.get('token');
  const clientId = params.get('client_id');
  if (!rawToken || !clientId) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'token and client_id are required.' },
      { status: 400, headers: oauthCorsHeaders },
    );
  }

  const convex = createServerConvexClient();
  await convex.mutation(api.oauthProvider.revokeToken, {
    tokenHash: hashToken(rawToken),
    clientId,
  });
  return new NextResponse(null, { status: 200, headers: oauthCorsHeaders });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: oauthCorsHeaders });
}
