import { timingSafeEqual } from 'node:crypto';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import {
  type AppControllerRoute,
  type BaseAdapter,
  type BoardQueues,
  type HandlerResponse,
  type IServerAdapter,
  type UIConfig,
  createBoard,
} from '@bullwatch/api';

export interface Proxy {
  server: Server;
  port: number;
  close: () => Promise<void>;
}

export async function startProxy(args: {
  queues: ReadonlyArray<BaseAdapter>;
  token: string;
  port?: number;
  host?: string;
}): Promise<Proxy> {
  const { queues, token, port = 0, host = '0.0.0.0' } = args;
  if (!token) {
    throw new Error('startProxy requires a non-empty token');
  }

  const adapter = new HeadlessAdapter();
  createBoard({ queues, serverAdapter: adapter, options: { uiBasePath: '/unused' } });

  const server = createServer((req, res) => {
    handleRequest(adapter, token, req, res).catch(() => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal error' }));
    });
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  if (!address || typeof address !== 'object') {
    throw new Error('proxy server has no address');
  }

  return {
    server,
    port: address.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function handleRequest(
  adapter: HeadlessAdapter,
  token: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (!isAuthorized(req, token)) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  await adapter.handle(req, res, url);
}

function isAuthorized(req: IncomingMessage, token: string): boolean {
  const header = req.headers.authorization ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (presented.length !== token.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(presented), Buffer.from(token));
}

class HeadlessAdapter implements IServerAdapter {
  private boardQueues: BoardQueues = new Map();
  private uiConfig: UIConfig = {};
  private apiRoutes: AppControllerRoute[] = [];
  private errorHandler: ((error: Error) => HandlerResponse) | undefined;

  setQueues(boardQueues: BoardQueues) {
    this.boardQueues = boardQueues;
    return this;
  }

  setViewsPath() {
    return this;
  }

  setStaticPath() {
    return this;
  }

  setEntryRoute() {
    return this;
  }

  setErrorHandler(handler: (error: Error) => HandlerResponse) {
    this.errorHandler = handler;
    return this;
  }

  setApiRoutes(routes: AppControllerRoute[]) {
    this.apiRoutes = routes;
    return this;
  }

  setUIConfig(config: UIConfig) {
    this.uiConfig = config;
    return this;
  }

  async handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const method = (req.method ?? 'get').toLowerCase();
    const matched = findRoute(this.apiRoutes, method, url.pathname);

    if (!matched) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'route not found' }));
      return;
    }

    try {
      const response = await matched.route.handler({
        queues: this.boardQueues,
        uiConfig: this.uiConfig,
        query: Object.fromEntries(url.searchParams),
        params: matched.params,
        body: await readJsonBody(req),
        headers: req.headers as Record<string, string | undefined>,
      });
      sendResponse(res, response);
    } catch (error) {
      if (!this.errorHandler || !(error instanceof Error)) {
        throw error;
      }
      sendResponse(res, this.errorHandler(error));
    }
  }
}

function findRoute(
  routes: AppControllerRoute[],
  method: string,
  pathname: string,
): { route: AppControllerRoute; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }
    const params = matchRoute(route.route, pathname);
    if (params) {
      return { route, params };
    }
  }
  return null;
}

function matchRoute(routePattern: string, pathname: string): Record<string, string> | null {
  const patternSegments = routePattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (const [index, patternSegment] of patternSegments.entries()) {
    const pathSegment = pathSegments[index] ?? '';
    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
    } else if (patternSegment !== pathSegment) {
      return null;
    }
  }
  return params;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function sendResponse(res: ServerResponse, response: HandlerResponse): void {
  const status = response.status ?? 200;
  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(response.body ?? null));
}
