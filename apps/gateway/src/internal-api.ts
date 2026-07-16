import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { type RequestFrame, type RpcResponse, rpcRequestSchema } from '@superbull/protocol';
import { WebSocket } from 'ws';
import { RpcTimeoutError } from './errors';
import type { SessionRegistry } from './session-registry';

export interface InternalApiArgs {
  registry: SessionRegistry;
  internalToken: string;
  rpcTimeoutMs: number;
}

export async function handleInternalRequest(
  args: InternalApiArgs,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/healthz') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!isAuthorized(req, args.internalToken)) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/internal/rpc') {
    await handleRpc(args, req, res);
    return;
  }

  const statusMatch = url.pathname.match(/^\/internal\/connectors\/([^/]+)\/status$/);
  if (req.method === 'GET' && statusMatch) {
    const connectorId = decodeURIComponent(statusMatch[1] as string);
    handleStatus(args.registry, connectorId, res);
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}

async function handleRpc(
  args: InternalApiArgs,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readJsonBody(req);
  const parsed = rpcRequestSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, { error: 'invalid request' });
    return;
  }

  const session = args.registry.get(parsed.data.connector_id);
  if (!session || session.ws.readyState !== WebSocket.OPEN) {
    sendJson(res, 502, { error: 'connector disconnected' });
    return;
  }

  const id = randomUUID();
  try {
    const response = await new Promise<RpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        session.pendingRpc.delete(id);
        reject(new RpcTimeoutError());
      }, args.rpcTimeoutMs);

      session.pendingRpc.set(id, {
        resolve: (frame) => {
          clearTimeout(timer);
          resolve(frame);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      const requestFrame: RequestFrame = {
        type: 'request',
        id,
        method: parsed.data.method,
        path: parsed.data.path,
        search: parsed.data.search,
        body: parsed.data.body,
        content_type: parsed.data.content_type,
      };
      session.ws.send(JSON.stringify(requestFrame));
    });
    sendJson(res, 200, response);
  } catch (error) {
    if (error instanceof RpcTimeoutError) {
      sendJson(res, 504, { error: 'connector timeout' });
      return;
    }
    sendJson(res, 502, { error: 'connector disconnected' });
  }
}

function handleStatus(registry: SessionRegistry, connectorId: string, res: ServerResponse): void {
  const session = registry.get(connectorId);
  if (!session) {
    sendJson(res, 200, {
      connected: false,
      connected_at: null,
      name: null,
      version: null,
      queues: [],
    });
    return;
  }
  sendJson(res, 200, {
    connected: true,
    connected_at: session.connectedAt,
    name: session.name,
    version: session.version,
    queues: session.queues,
  });
}

function isAuthorized(req: IncomingMessage, token: string): boolean {
  const header = req.headers.authorization ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (presented.length !== token.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(presented), Buffer.from(token));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
