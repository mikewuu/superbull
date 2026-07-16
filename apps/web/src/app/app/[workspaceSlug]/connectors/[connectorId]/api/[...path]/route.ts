import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '../../../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../../../convex/_generated/dataModel';
import { findConnectorById } from '../../../../../../../lib/connectors/find-connector-by-id';
import { callGatewayRpc } from '../../../../../../../lib/gateway/call-gateway-rpc';

async function handle(
  req: Request,
  context: { params: Promise<{ workspaceSlug: string; connectorId: string; path: string[] }> },
): Promise<NextResponse> {
  const { workspaceSlug, connectorId, path } = await context.params;

  const token = await convexAuthNextjsToken();
  const resolved = await fetchQuery(
    api.workspaces.findWorkspaceBySlug,
    { slug: workspaceSlug },
    { token },
  );
  if (!resolved) {
    return NextResponse.json({ error: 'workspace not found' }, { status: 404 });
  }

  const connector = await findConnectorById(
    resolved.workspace._id,
    connectorId as Id<'connectors'>,
  );
  if (!connector) {
    return NextResponse.json({ error: 'connector not found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const method = req.method;
  const body = method === 'GET' || method === 'HEAD' ? null : await req.text();

  // 502 {"error":"connector disconnected"} and 504 {"error":"connector
  // timeout"} come back from the gateway verbatim and are surfaced as-is.
  const result = await callGatewayRpc({
    connectorId: connector.id,
    method,
    path,
    search: url.search,
    body,
    contentType: req.headers.get('content-type'),
  });

  return new NextResponse(result.status === 204 ? null : result.body, {
    status: result.status,
    headers: result.contentType ? { 'content-type': result.contentType } : undefined,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
