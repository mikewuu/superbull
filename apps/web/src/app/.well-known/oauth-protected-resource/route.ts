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
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      scopes_supported: ['mcp'],
      bearer_methods_supported: ['header'],
    },
    { headers: { ...oauthCorsHeaders, 'Cache-Control': 'max-age=3600' } },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: oauthCorsHeaders });
}
