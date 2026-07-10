import { join } from 'node:path';
import { bodyParser } from '@koa/bodyparser';
import Router from '@koa/router';
import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '@superbull/api';
import ejs from 'ejs';
import type { Middleware } from 'koa';
import serve from 'koa-static';

export class KoaAdapter implements IServerAdapter {
  protected basePath = '';
  protected boardQueues: BoardQueues | undefined;
  protected errorHandler: ((error: Error) => HandlerResponse) | undefined;
  protected statics: { path: string; route: string } | undefined;
  protected viewsPath: string | undefined;
  protected entryRoute: AppViewRoute | undefined;
  protected apiRoutes: AppControllerRoute[] | undefined;
  protected uiConfig: UIConfig = {};

  public setBasePath(path: string): KoaAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): KoaAdapter {
    this.statics = { route: staticsRoute, path: staticsPath };
    return this;
  }

  public setViewsPath(viewPath: string): KoaAdapter {
    this.viewsPath = viewPath;
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): KoaAdapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): KoaAdapter {
    this.apiRoutes = routes;
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): KoaAdapter {
    this.entryRoute = routeDef;
    return this;
  }

  public setQueues(boardQueues: BoardQueues): KoaAdapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): KoaAdapter {
    this.uiConfig = config;
    return this;
  }

  public registerPlugin(options: { mount?: string } = {}): Middleware {
    const { statics, entryRoute, viewsPath, apiRoutes, boardQueues, errorHandler } = this;
    if (!statics) {
      throw new Error(`Please call 'setStaticPath' before using 'registerPlugin'`);
    }
    if (!entryRoute) {
      throw new Error(`Please call 'setEntryRoute' before using 'registerPlugin'`);
    }
    if (!viewsPath) {
      throw new Error(`Please call 'setViewsPath' before using 'registerPlugin'`);
    }
    if (!apiRoutes) {
      throw new Error(`Please call 'setApiRoutes' before using 'registerPlugin'`);
    }
    if (!boardQueues) {
      throw new Error(`Please call 'setQueues' before using 'registerPlugin'`);
    }
    if (!errorHandler) {
      throw new Error(`Please call 'setErrorHandler' before using 'registerPlugin'`);
    }

    const mountPath = (options.mount ?? this.basePath).replace(/\/$/, '');
    const router = mountPath ? new Router({ prefix: mountPath }) : new Router();

    const entryPaths = Array.isArray(entryRoute.route) ? entryRoute.route : [entryRoute.route];
    for (const path of entryPaths) {
      router[entryRoute.method](path, async (ctx) => {
        const view = entryRoute.handler({ basePath: this.basePath, uiConfig: this.uiConfig });
        ctx.type = 'html';
        ctx.body = await ejs.renderFile(join(viewsPath, view.name), view.params);
      });
    }

    for (const route of apiRoutes) {
      this.addApiRoute(router, route, boardQueues, errorHandler);
    }

    return composeMiddlewares([
      bodyParser(),
      serveUnder(`${mountPath}${statics.route}`, statics.path),
      router.routes() as Middleware,
      router.allowedMethods() as Middleware,
    ]);
  }

  private addApiRoute(
    router: Router,
    route: AppControllerRoute,
    boardQueues: BoardQueues,
    errorHandler: (error: Error) => HandlerResponse,
  ): void {
    router[route.method](route.route, async (ctx) => {
      try {
        const response = await route.handler({
          queues: boardQueues,
          uiConfig: this.uiConfig,
          query: ctx.query,
          params: ctx.params ?? {},
          body: (ctx.request.body ?? {}) as Record<string, unknown>,
          headers: ctx.request.headers as Record<string, string | undefined>,
        });

        if (response.status === 204) {
          ctx.status = 204;
          return;
        }
        if (response.contentType) {
          ctx.status = response.status || 200;
          ctx.type = response.contentType;
          ctx.body = String(response.body);
          return;
        }
        ctx.status = response.status || 200;
        ctx.body = response.body;
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
        const response = errorHandler(error);
        ctx.status = response.status || 500;
        ctx.body = response.body;
      }
    });
  }
}

function serveUnder(routePrefix: string, staticsPath: string): Middleware {
  const serveStaticFiles = serve(staticsPath);

  return async (ctx, next) => {
    if (!ctx.path.startsWith(`${routePrefix}/`)) {
      return next();
    }

    const requestPath = ctx.path;
    ctx.path = ctx.path.slice(routePrefix.length);
    try {
      await serveStaticFiles(ctx, async () => undefined);
    } finally {
      ctx.path = requestPath;
    }

    if (ctx.body == null) {
      return next();
    }
  };
}

function composeMiddlewares(middlewares: Middleware[]): Middleware {
  return (ctx, next) => {
    const dispatch = (index: number): Promise<unknown> => {
      const middleware = middlewares[index];
      if (!middleware) {
        return Promise.resolve(next());
      }
      return Promise.resolve(middleware(ctx, () => dispatch(index + 1)));
    };
    return dispatch(0);
  };
}
