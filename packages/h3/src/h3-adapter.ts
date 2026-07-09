import { readFileSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '@bullwatch/api';
import ejs from 'ejs';
import {
  createRouter,
  eventHandler,
  getHeaders,
  getQuery,
  getRouterParams,
  readBody,
  type Router,
  sendNoContent,
  serveStatic,
  setResponseStatus,
} from 'h3';
import type { H3Event } from 'h3';

export class H3Adapter implements IServerAdapter {
  protected readonly router: Router = createRouter();
  protected basePath = '';
  protected boardQueues: BoardQueues | undefined;
  protected errorHandler: ((error: Error) => HandlerResponse) | undefined;
  protected statics: { path: string; route: string } | undefined;
  protected viewsPath: string | undefined;
  protected entryRoute: AppViewRoute | undefined;
  protected uiConfig: UIConfig = {};

  public setBasePath(path: string): H3Adapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): H3Adapter {
    this.statics = { route: staticsRoute, path: staticsPath };
    return this;
  }

  public setViewsPath(viewPath: string): H3Adapter {
    this.viewsPath = viewPath;
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): H3Adapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): H3Adapter {
    const { boardQueues, errorHandler } = this;
    if (!boardQueues) {
      throw new Error(`Please call 'setQueues' before 'setApiRoutes'`);
    }
    if (!errorHandler) {
      throw new Error(`Please call 'setErrorHandler' before 'setApiRoutes'`);
    }

    for (const route of routes) {
      this.addApiRoute(route, boardQueues, errorHandler);
    }
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): H3Adapter {
    this.entryRoute = routeDef;
    return this;
  }

  public setQueues(boardQueues: BoardQueues): H3Adapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): H3Adapter {
    this.uiConfig = config;
    return this;
  }

  public registerHandlers(): Router {
    const { statics, entryRoute, viewsPath } = this;
    if (!statics) {
      throw new Error(`Please call 'setStaticPath' before using 'registerHandlers'`);
    }
    if (!entryRoute) {
      throw new Error(`Please call 'setEntryRoute' before using 'registerHandlers'`);
    }
    if (!viewsPath) {
      throw new Error(`Please call 'setViewsPath' before using 'registerHandlers'`);
    }

    const entryPaths = Array.isArray(entryRoute.route) ? entryRoute.route : [entryRoute.route];
    for (const path of entryPaths) {
      this.router.use(
        `${this.basePath}${path}`,
        eventHandler(() => {
          const view = entryRoute.handler({ basePath: this.basePath, uiConfig: this.uiConfig });
          return ejs.renderFile(join(viewsPath, view.name), view.params);
        }),
        entryRoute.method,
      );
    }

    const staticsRoutePrefix = `${this.basePath}${statics.route}/`;
    this.router.get(
      `${this.basePath}${statics.route}/**`,
      eventHandler((event) => {
        return serveStatic(event, {
          fallthrough: false,
          getContents: (id) => {
            const filePath = findStaticFilePath({
              requestPath: id,
              routePrefix: staticsRoutePrefix,
              staticsPath: statics.path,
            });
            if (!filePath) {
              throw new Error(`static file not found: ${id}`);
            }
            return readFileSync(filePath);
          },
          getMeta: (id) => {
            const filePath = findStaticFilePath({
              requestPath: id,
              routePrefix: staticsRoutePrefix,
              staticsPath: statics.path,
            });
            if (!filePath) {
              return undefined;
            }
            try {
              const stats = statSync(filePath);
              return { size: stats.size, type: getContentType(filePath) };
            } catch {
              return undefined;
            }
          },
        });
      }),
    );

    return this.router;
  }

  private addApiRoute(
    route: AppControllerRoute,
    boardQueues: BoardQueues,
    errorHandler: (error: Error) => HandlerResponse,
  ): void {
    this.router.use(
      `${this.basePath}${route.route}`,
      eventHandler(async (event) => {
        try {
          const response = await route.handler({
            queues: boardQueues,
            uiConfig: this.uiConfig,
            query: getQuery(event),
            params: getRouterParams(event, { decode: true }),
            body: route.method === 'get' ? {} : await readJsonBody(event),
            headers: getHeaders(event),
          });

          if (response.status === 204) {
            return sendNoContent(event, 204);
          }
          setResponseStatus(event, response.status || 200);
          return response.body;
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }
          const response = errorHandler(error);
          setResponseStatus(event, response.status || 500);
          return response.body;
        }
      }),
      route.method,
    );
  }
}

async function readJsonBody(event: H3Event): Promise<Record<string, unknown>> {
  const body = await readBody(event).catch(() => undefined);
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body;
  }
  return {};
}

function findStaticFilePath(args: {
  requestPath: string;
  routePrefix: string;
  staticsPath: string;
}): string | null {
  if (!args.requestPath.startsWith(args.routePrefix)) {
    return null;
  }

  const relativePath = normalize(args.requestPath).replace(args.routePrefix, '');
  const absolutePath = resolve(args.staticsPath, relativePath);
  if (!absolutePath.startsWith(resolve(args.staticsPath))) {
    return null;
  }

  return absolutePath;
}

const contentTypes: Record<string, string> = {
  js: 'text/javascript',
  css: 'text/css',
  html: 'text/html',
  txt: 'text/plain',
  json: 'application/json',
  map: 'application/json',
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop() ?? '';
  return contentTypes[extension] ?? 'application/octet-stream';
}
