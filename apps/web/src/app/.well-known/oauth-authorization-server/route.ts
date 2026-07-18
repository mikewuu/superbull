import { NextResponse } from 'next/server';

const oauthCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, mcp-protocol-version',
};

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      revocation_endpoint: `${origin}/api/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp'],
    },
    { headers: { ...oauthCorsHeaders, 'Cache-Control': 'max-age=3600' } },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: oauthCorsHeaders });
}
