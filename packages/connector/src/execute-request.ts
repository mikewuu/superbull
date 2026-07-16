import {
  type AppControllerRoute,
  type BaseAdapter,
  type BoardQueues,
  type HandlerResponse,
  type IServerAdapter,
  type UIConfig,
  createBoard,
} from '@superbull/api';
import type { RequestFrame, ResponseFrame } from '@superbull/protocol';

/**
 * Builds an `executeRequest(frame) -> Promise<ResponseFrame>` function that
 * matches gateway `request` frames against @superbull/api's appRoutes, the
 * same route table the standalone dashboard and packages/proxy serve. This
 * is the connector's RPC executor: no HTTP server, no listening socket — the
 * gateway pushes `request` frames down the outbound WS connection and we
 * resolve each with a `response` frame.
 */
export function createExecuteRequest(
  queues: ReadonlyArray<BaseAdapter>,
): (frame: RequestFrame) => Promise<ResponseFrame> {
  const adapter = new HeadlessAdapter();
  createBoard({ queues, serverAdapter: adapter, options: { uiBasePath: '/unused' } });

  return async (frame: RequestFrame): Promise<ResponseFrame> => {
    try {
      return await adapter.handle(frame);
    } catch {
      return {
        type: 'response',
        id: frame.id,
        status: 500,
        body: JSON.stringify({ error: 'internal error' }),
        content_type: 'application/json',
      };
    }
  };
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

  async handle(frame: RequestFrame): Promise<ResponseFrame> {
    const method = frame.method.toLowerCase();
    const matched = findRoute(this.apiRoutes, method, frame.path);

    if (!matched) {
      return respond(frame.id, { status: 404, body: { error: 'route not found' } });
    }

    try {
      const response = await matched.route.handler({
        queues: this.boardQueues,
        uiConfig: this.uiConfig,
        query: Object.fromEntries(new URLSearchParams(frame.search)),
        params: matched.params,
        body: parseJsonBody(frame.body),
        headers: frame.content_type ? { 'content-type': frame.content_type } : {},
      });
      return respond(frame.id, response);
    } catch (error) {
      if (!this.errorHandler || !(error instanceof Error)) {
        throw error;
      }
      return respond(frame.id, this.errorHandler(error));
    }
  }
}

function findRoute(
  routes: AppControllerRoute[],
  method: string,
  pathSegments: string[],
): { route: AppControllerRoute; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }
    const params = matchRoute(route.route, pathSegments);
    if (params) {
      return { route, params };
    }
  }
  return null;
}

function matchRoute(routePattern: string, pathSegments: string[]): Record<string, string> | null {
  const patternSegments = routePattern.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (const [index, patternSegment] of patternSegments.entries()) {
    const pathSegment = pathSegments[index] ?? '';
    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = pathSegment;
    } else if (patternSegment !== pathSegment) {
      return null;
    }
  }
  return params;
}

function parseJsonBody(raw: string | null): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function respond(id: string, response: HandlerResponse): ResponseFrame {
  const status = response.status ?? 200;
  if (status === 204) {
    return { type: 'response', id, status, body: '', content_type: null };
  }
  return {
    type: 'response',
    id,
    status,
    body: JSON.stringify(response.body ?? null),
    content_type: response.contentType ?? 'application/json',
  };
}
