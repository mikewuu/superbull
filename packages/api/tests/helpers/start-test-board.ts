import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createBoard } from '../../src/create-board';
import type { BaseAdapter } from '../../src/queue-adapters/base-adapter';
import type {
  AppControllerRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '../../src/types';

export interface TestResponse {
  status: number;
  body: unknown;
}

export interface TestBoard {
  request: (method: string, path: string, body?: unknown) => Promise<TestResponse>;
  board: ReturnType<typeof createBoard>;
  close: () => Promise<void>;
}

export async function startTestBoard(queues: BaseAdapter[]): Promise<TestBoard> {
  const serverAdapter = new HttpTestAdapter();
  const board = createBoard({
    queues,
    serverAdapter,
    options: { uiBasePath: '/nonexistent-test-ui' },
  });

  const server = createServer((req, res) => {
    serverAdapter.handle(req, res).catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const baseUrl = getBaseUrl(server);

  return {
    board,
    request: async (method, path, body) => {
      const res = await fetch(`${baseUrl}${path}`, {
        method: method.toUpperCase(),
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: parseJsonOrText(text) };
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function getBaseUrl(server: Server): string {
  const address = server.address();
  if (!address || typeof address !== 'object') {
    throw new Error('server has no address');
  }
  return `http://127.0.0.1:${address.port}`;
}

function parseJsonOrText(text: string): unknown {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

class HttpTestAdapter implements IServerAdapter {
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

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
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
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sendResponse(res: ServerResponse, response: HandlerResponse): void {
  if (response.status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(response.status || 200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(response.body));
}
