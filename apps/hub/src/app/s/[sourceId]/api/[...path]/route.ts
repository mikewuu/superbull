import { NextResponse } from 'next/server';
import { forwardToProxy } from '../../../../../lib/forwarding/forward-to-proxy';
import { findSourceById } from '../../../../../lib/sources/find-source-by-id';

async function handle(
  req: Request,
  context: { params: Promise<{ sourceId: string; path: string[] }> },
): Promise<NextResponse> {
  const { sourceId, path } = await context.params;
  const source = await findSourceById(sourceId);
  if (!source) {
    return NextResponse.json({ error: 'source not found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const method = req.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();

  const result = await forwardToProxy({
    source,
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
