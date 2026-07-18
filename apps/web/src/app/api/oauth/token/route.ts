import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { api } from '../../../../../convex/_generated/api';
import { isWithinRateLimitForIp } from '../../../../lib/api/is-within-rate-limit-for-ip';
import { secondsUntilRateLimitReset } from '../../../../lib/api/seconds-until-rate-limit-reset';
import { hashToken } from '../../../../lib/auth/hash-token';
import { createServerConvexClient } from '../../../../lib/convex/create-server-convex-client';
import { getClientIp } from '../../../oauth/get-client-ip';

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
          'Cache-Control': 'no-store',
          'Retry-After': String(secondsUntilRateLimitReset()),
        },
      },
    );
  }

  const params = await parseParams(request);
  if (!params) {
    return oauthError('invalid_request', 'JSON fields must be strings.');
  }

  const grantType = params.get('grant_type');
  if (grantType === 'authorization_code') {
    return await exchangeAuthorizationCode(params);
  }
  if (grantType === 'refresh_token') {
    return await exchangeRefreshToken(params);
  }
  return oauthError('unsupported_grant_type', `grant_type "${grantType}"`);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: oauthCorsHeaders });
}

async function exchangeAuthorizationCode(params: URLSearchParams) {
  const code = params.get('code');
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const codeVerifier = params.get('code_verifier');
  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return oauthError(
      'invalid_request',
      'code, client_id, redirect_uri, and code_verifier are required.',
    );
  }

  const accessToken = `sbho_${randomBytes(24).toString('base64url')}`;
  const refreshToken = `sbhr_${randomBytes(24).toString('base64url')}`;
  const convex = createServerConvexClient();
  const result = await convex.mutation(api.oauthProvider.exchangeCode, {
    codeHash: hashToken(code),
    clientId,
    redirectUri,
    computedCodeChallenge: createHash('sha256').update(codeVerifier).digest('base64url'),
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
  });
  if (!result) {
    return oauthError('invalid_grant', 'code is invalid, used, or expired.');
  }
  return tokenResponse(accessToken, refreshToken, result.expiresInSeconds);
}

async function exchangeRefreshToken(params: URLSearchParams) {
  const refreshToken = params.get('refresh_token');
  const clientId = params.get('client_id');
  if (!refreshToken || !clientId) {
    return oauthError('invalid_request', 'refresh_token and client_id are required.');
  }

  const newAccessToken = `sbho_${randomBytes(24).toString('base64url')}`;
  const newRefreshToken = `sbhr_${randomBytes(24).toString('base64url')}`;
  const convex = createServerConvexClient();
  const result = await convex.mutation(api.oauthProvider.refreshTokens, {
    refreshTokenHash: hashToken(refreshToken),
    clientId,
    newAccessTokenHash: hashToken(newAccessToken),
    newRefreshTokenHash: hashToken(newRefreshToken),
  });
  if (!result) {
    return oauthError('invalid_grant', 'refresh_token is invalid, revoked, or expired.');
  }
  return tokenResponse(newAccessToken, newRefreshToken, result.expiresInSeconds);
}

async function parseParams(request: Request): Promise<URLSearchParams | null> {
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (!contentType.includes('application/json')) {
      return new URLSearchParams(await request.text());
    }

    const json: unknown = await request.json();
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return null;
    }
    const fields = Object.values(json);
    if (fields.some((value) => typeof value !== 'string')) {
      return null;
    }
    return new URLSearchParams(json as Record<string, string>);
  } catch {
    return null;
  }
}

function tokenResponse(accessToken: string, refreshToken: string, expiresInSeconds: number) {
  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresInSeconds,
      refresh_token: refreshToken,
      scope: 'mcp',
    },
    { headers: { ...oauthCorsHeaders, 'Cache-Control': 'no-store' } },
  );
}

function oauthError(error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status: 400, headers: { ...oauthCorsHeaders, 'Cache-Control': 'no-store' } },
  );
}
