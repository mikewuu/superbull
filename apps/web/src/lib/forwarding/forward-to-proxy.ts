// TRANSITIONAL — the old HTTP proxy flow. Round 3 replaces this with a
// gateway RPC call (POST /internal/rpc on apps/gateway) once connectors
// carry a live WebSocket connection instead of a static url/token. The
// caller (the connector SPA embed route under
// /app/[workspaceSlug]/connectors/[connectorId]/**) is responsible for
// verifying the caller is a workspace member (via
// lib/connectors/find-connector-by-id.ts, which does that check) before
// ever reaching this function — it does no auth of its own.
export interface ForwardToProxyArgs {
  connector: { url: string; token: string };
  method: string;
  path: string[];
  search: string;
  body: string | undefined;
  contentType: string | null;
}

export interface ForwardToProxyResult {
  status: number;
  body: string;
  contentType: string | null;
}

export async function forwardToProxy(args: ForwardToProxyArgs): Promise<ForwardToProxyResult> {
  const { connector, method, path, search, body, contentType } = args;
  const url = `${connector.url}/api/${path.join('/')}${search}`;
  const headers: Record<string, string> = { authorization: `Bearer ${connector.token}` };
  if (contentType) {
    headers['content-type'] = contentType;
  }

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body });
  } catch {
    return {
      status: 502,
      body: JSON.stringify({ error: 'proxy unreachable' }),
      contentType: 'application/json',
    };
  }

  return {
    status: response.status,
    body: await response.text(),
    contentType: response.headers.get('content-type'),
  };
}
