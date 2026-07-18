import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { api } from '../../../../../convex/_generated/api';
import { isWithinRateLimitForIp } from '../../../../lib/api/is-within-rate-limit-for-ip';
import { secondsUntilRateLimitReset } from '../../../../lib/api/seconds-until-rate-limit-reset';
import { createServerConvexClient } from '../../../../lib/convex/create-server-convex-client';
import { getClientIp } from '../../../oauth/get-client-ip';
import { isAllowedRedirectUri } from '../../../oauth/is-allowed-redirect-uri';

export const runtime = 'nodejs';

const oauthCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, mcp-protocol-version',
};

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!(await isWithinRateLimitForIp(ip))) {
    return NextResponse.json(
      { error: 'slow_down' },
      {
        status: 429,
        headers: {
          ...oauthCorsHeaders,
          'Retry-After': String(secondsUntilRateLimitReset()),
        },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    client_name?: unknown;
    redirect_uris?: unknown;
  } | null;
  if (!body || typeof body !== 'object') {
    return oauthError('invalid_client_metadata', 'Body must be JSON.');
  }

  const redirectUris = body.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length < 1 ||
    redirectUris.length > 10 ||
    !redirectUris.every((redirectUri): redirectUri is string => typeof redirectUri === 'string')
  ) {
    return oauthError('invalid_client_metadata', 'redirect_uris must be an array of 1-10 strings.');
  }

  const invalidRedirectUri = redirectUris.find((redirectUri) => !isAllowedRedirectUri(redirectUri));
  if (invalidRedirectUri) {
    return oauthError(
      'invalid_redirect_uri',
      `Redirect URIs must use https or loopback http without credentials or fragments: ${invalidRedirectUri}`,
    );
  }

  const clientName = getClientName(body.client_name);
  const clientId = `sbc_${randomBytes(24).toString('base64url')}`;
  const convex = createServerConvexClient();
  await convex.mutation(api.oauthProvider.registerClient, {
    clientId,
    name: clientName,
    redirectUris,
  });
  return NextResponse.json(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
    { status: 201, headers: oauthCorsHeaders },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: oauthCorsHeaders });
}

function getClientName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'MCP client';
  }
  return value.trim().slice(0, 120);
}

function oauthError(error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status: 400, headers: oauthCorsHeaders },
  );
}
