import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '@bullwatch/api';
import type { Plugin, RouteOptions } from '@hapi/hapi';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import ejs from 'ejs';

export class HapiAdapter implements IServerAdapter {
  private basePath = '';
  private boardQueues: BoardQueues | undefined;
  private errorHandler: ((error: Error) => HandlerResponse) | undefined;
  private statics: { route: string; path: string } | undefined;
  private viewPath: string | undefined;
  private entryRoute: AppViewRoute | undefined;
  private apiRoutes: AppControllerRoute[] | undefined;
  private uiConfig: UIConfig = {};

  public setBasePath(path: string): HapiAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): HapiAdapter {
    this.statics = { route: staticsRoute, path: staticsPath };
    return this;
  }

  public setViewsPath(viewPath: string): HapiAdapter {
    this.viewPath = viewPath;
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): HapiAdapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): HapiAdapter {
    this.apiRoutes = routes;
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): HapiAdapter {
    this.entryRoute = routeDef;
    return this;
  }

  public setQueues(boardQueues: BoardQueues): HapiAdapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): HapiAdapter {
    this.uiConfig = config;
    return this;
  }

  public registerPlugin(): Plugin<RouteOptions> {
    return {
      name: '@bullwatch/hapi',
      register: async (server, routeOptions = {}) => {
        const { statics, entryRoute, viewPath, apiRoutes, boardQueues, errorHandler } = this;
        if (!statics) {
          throw new Error(`Please call 'setStaticPath' before 'registerPlugin'`);
        }
        if (!entryRoute) {
          throw new Error(`Please call 'setEntryRoute' before 'registerPlugin'`);
        }
        if (!viewPath) {
          throw new Error(`Please call 'setViewsPath' before 'registerPlugin'`);
        }
        if (!apiRoutes) {
          throw new Error(`Please call 'setApiRoutes' before 'registerPlugin'`);
        }
        if (!boardQueues) {
          throw new Error(`Please call 'setQueues' before 'registerPlugin'`);
        }
        if (!errorHandler) {
          throw new Error(`Please call 'setErrorHandler' before 'registerPlugin'`);
        }

        await server.register(Vision);
        server.views({ engines: { ejs }, path: viewPath });
        await server.register(Inert);

        server.route({
          method: 'GET',
          path: `${statics.route}/{param*}`,
          options: routeOptions,
          handler: { directory: { path: statics.path } },
        });

        const entryPaths = Array.isArray(entryRoute.route) ? entryRoute.route : [entryRoute.route];
        for (const entryPath of entryPaths) {
          server.route({
            method: entryRoute.method,
            path: toHapiPath(entryPath),
            options: routeOptions,
            handler: (_request, h) => {
              const { name, params } = entryRoute.handler({
                basePath: this.basePath,
                uiConfig: this.uiConfig,
              });
              return h.view(name, params);
            },
          });
        }

        for (const route of apiRoutes) {
          server.route({
            method: route.method,
            path: toHapiPath(route.route),
            options: routeOptions,
            handler: async (request, h) => {
              try {
                const response = await route.handler({
                  queues: boardQueues,
                  uiConfig: this.uiConfig,
                  params: request.params,
                  query: request.query,
                  body: parseBody(request.payload),
                  headers: flattenHeaders(request.headers),
                });

                if (response.status === 204) {
                  return h.response().code(204);
                }
                return h.response(response.body).code(response.status || 200);
              } catch (error) {
                const response = errorHandler(
                  error instanceof Error ? error : new Error(String(error)),
                );
                return h.response(response.body).code(response.status || 500);
              }
            },
          });
        }
      },
    };
  }
}

function toHapiPath(path: string): string {
  return path
    .split('/')
    .map((segment) => (segment.startsWith(':') ? `{${segment.substring(1)}}` : segment))
    .join('/');
}

function parseBody(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Buffer.isBuffer(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function flattenHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const entries = Object.entries(headers).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ]);

  return Object.fromEntries(entries);
}
