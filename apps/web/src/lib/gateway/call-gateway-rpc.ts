import { RPC_TIMEOUT_MS, type RpcRequest, rpcResponseSchema } from '@superbull/protocol';
import { getGatewayConfig } from './gateway-config';

export interface CallGatewayRpcArgs {
  connectorId: string;
  method: string;
  path: string[];
  search: string;
  body: string | null;
  contentType: string | null;
}

export interface CallGatewayRpcResult {
  status: number;
  body: string;
  contentType: string | null;
}

// Forwards one dashboard/MCP request to the connector over the gateway:
// POST ${GATEWAY_URL}/internal/rpc (Bearer GATEWAY_INTERNAL_TOKEN). On 200
// the gateway envelope carries the connector's own response (status/body/
// content_type), which is what we return. Gateway-level failures — 502
// {"error":"connector disconnected"}, 504 {"error":"connector timeout"} —
// pass through untouched so the SPA sees them as-is.
export async function callGatewayRpc(args: CallGatewayRpcArgs): Promise<CallGatewayRpcResult> {
  const gateway = getGatewayConfig();
  if (!gateway) {
    return jsonError(502, 'gateway not configured');
  }

  const request: RpcRequest = {
    connector_id: args.connectorId,
    method: args.method,
    // The connector executor matches the frame path against @superbull/api
    // appRoutes, whose patterns carry the /api prefix ('/api/queues', ...) —
    // callers pass bare paths and the prefix is added once, here.
    path: ['api', ...args.path],
    search: args.search,
    body: args.body,
    content_type: args.contentType,
  };

  let response: Response;
  let text: string;
  try {
    response = await fetch(`${gateway.url}/internal/rpc`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${gateway.internalToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
      // The gateway itself gives up after RPC_TIMEOUT_MS (504); this only
      // bounds a gateway that never answers at all.
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS + 5_000),
    });
    // Inside the try: a connection that dies mid-body rejects text(), and
    // that's the same "gateway unreachable" failure as a refused connect.
    text = await response.text();
  } catch {
    return jsonError(502, 'gateway unreachable');
  }
  if (response.status !== 200) {
    return {
      status: response.status,
      body: text,
      contentType: response.headers.get('content-type'),
    };
  }

  const parsed = rpcResponseSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    return jsonError(502, 'invalid gateway response');
  }
  return {
    status: parsed.data.status,
    body: parsed.data.body,
    contentType: parsed.data.content_type,
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jsonError(status: number, error: string): CallGatewayRpcResult {
  return { status, body: JSON.stringify({ error }), contentType: 'application/json' };
}
