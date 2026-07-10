import { join, relative } from 'node:path';
import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '@bullwatch/api';
import ejs from 'ejs';
import { type Context, Hono, type MiddlewareHandler } from 'hono';

type ServeStatic = (options: {
  root: string;
  rewriteRequestPath?: (path: string) => string;
}) => MiddlewareHandler;

export class HonoAdapter implements IServerAdapter {
  protected readonly serveStatic: ServeStatic;
  protected readonly apiRoutes: Hono;
  protected basePath = '/';
  protected boardQueues: BoardQueues | undefined;
  protected errorHandler: ((error: Error) => HandlerResponse) | undefined;
  protected statics: { path: string; route: string } | undefined;
  protected viewsPath: string | undefined;
  protected entryRoute: AppViewRoute | undefined;
  protected uiConfig: UIConfig = {};

  constructor(serveStatic: ServeStatic) {
    this.serveStatic = serveStatic;
    this.apiRoutes = new Hono();
  }

  public setBasePath(path: string): HonoAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): HonoAdapter {
    this.statics = { route: staticsRoute, path: staticsPath };
    return this;
  }

  public setViewsPath(viewPath: string): HonoAdapter {
    this.viewsPath = viewPath;
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): HonoAdapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): HonoAdapter {
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

  public setEntryRoute(routeDef: AppViewRoute): HonoAdapter {
    this.entryRoute = routeDef;
    return this;
  }

  public setQueues(boardQueues: BoardQueues): HonoAdapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): HonoAdapter {
    this.uiConfig = config;
    return this;
  }

  public registerPlugin(): Hono {
    const { statics, entryRoute, viewsPath } = this;
    if (!statics) {
      throw new Error(`Please call 'setStaticPath' before using 'registerPlugin'`);
    }
    if (!entryRoute) {
      throw new Error(`Please call 'setEntryRoute' before using 'registerPlugin'`);
    }
    if (!viewsPath) {
      throw new Error(`Please call 'setViewsPath' before using 'registerPlugin'`);
    }

    const app = new Hono();

    const staticBaseUrlPath = [this.basePath, statics.route].join('/').replace(/\/{2,}/g, '/');
    app.get(
      `${statics.route}/*`,
      this.serveStatic({
        root: relative(process.cwd(), statics.path),
        rewriteRequestPath: (path) => path.replace(staticBaseUrlPath, ''),
      }),
    );

    app.route('/', this.apiRoutes);

    const entryPaths = Array.isArray(entryRoute.route) ? entryRoute.route : [entryRoute.route];
    for (const path of entryPaths) {
      app[entryRoute.method](path, async (c) => {
        const view = entryRoute.handler({ basePath: this.basePath, uiConfig: this.uiConfig });
        const html = await ejs.renderFile(join(viewsPath, view.name), view.params);
        return c.html(html);
      });
    }

    return app;
  }

  private addApiRoute(
    route: AppControllerRoute,
    boardQueues: BoardQueues,
    errorHandler: (error: Error) => HandlerResponse,
  ): void {
    this.apiRoutes[route.method](route.route, async (c) => {
      const requestBody = route.method === 'get' ? {} : await readJsonBody(c);

      try {
        const { status, body, contentType } = await route.handler({
          queues: boardQueues,
          uiConfig: this.uiConfig,
          query: c.req.query(),
          params: c.req.param(),
          body: requestBody,
          headers: c.req.header(),
        });

        if (status === 204) {
          return c.body(null, 204);
        }
        if (contentType) {
          c.header('content-type', contentType);
          return c.body(String(body), status ?? 200);
        }
        return c.json(body, status ?? 200);
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
        const { status, body } = errorHandler(error);
        if (status === 204 || status === undefined) {
          return c.json(body, 500);
        }
        return c.json(body, status);
      }
    });
  }
}

async function readJsonBody(c: Context): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body;
    }
    return {};
  } catch {
    return {};
  }
}
