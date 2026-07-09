import { join, resolve } from 'node:path';
import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '@bullwatch/api';
import { file } from 'bun';
import ejs from 'ejs';

type BunHandler = (request: Request) => Response | Promise<Response>;
type BunRoutes = Record<string, Record<string, BunHandler>>;

export class BunAdapter implements IServerAdapter {
  private basePath = '/';
  private boardQueues: BoardQueues | undefined;
  private errorHandler: ((error: Error) => HandlerResponse) | undefined;
  private statics: { route: string; path: string } | undefined;
  private viewPath: string | undefined;
  private entryRoute: AppViewRoute | undefined;
  private apiRoutes: AppControllerRoute[] | undefined;
  private uiConfig: UIConfig = {};

  public setBasePath(path: string): BunAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): BunAdapter {
    this.statics = { route: staticsRoute, path: staticsPath };
    return this;
  }

  public setViewsPath(viewPath: string): BunAdapter {
    this.viewPath = viewPath;
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): BunAdapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): BunAdapter {
    this.apiRoutes = routes;
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): BunAdapter {
    this.entryRoute = routeDef;
    return this;
  }

  public setQueues(boardQueues: BoardQueues): BunAdapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): BunAdapter {
    this.uiConfig = config;
    return this;
  }

  public getRoutes(): BunRoutes {
    const { statics, entryRoute, viewPath, apiRoutes, boardQueues, errorHandler } = this;
    if (!statics) {
      throw new Error(`Please call 'setStaticPath' before 'getRoutes'`);
    }
    if (!entryRoute) {
      throw new Error(`Please call 'setEntryRoute' before 'getRoutes'`);
    }
    if (!viewPath) {
      throw new Error(`Please call 'setViewsPath' before 'getRoutes'`);
    }
    if (!apiRoutes) {
      throw new Error(`Please call 'setApiRoutes' before 'getRoutes'`);
    }
    if (!boardQueues) {
      throw new Error(`Please call 'setQueues' before 'getRoutes'`);
    }
    if (!errorHandler) {
      throw new Error(`Please call 'setErrorHandler' before 'getRoutes'`);
    }

    const routes: BunRoutes = {};
    const staticBasePath = joinPaths(this.basePath, statics.route);

    routes[`${staticBasePath}/*`] = {
      GET: async (request) => {
        const pathname = new URL(request.url).pathname;
        const relativePath = pathname.replace(staticBasePath, '');
        const staticsRoot = resolve(statics.path);
        const requestedPath = resolve(join(statics.path, relativePath));

        if (!requestedPath.startsWith(staticsRoot)) {
          return new Response('Forbidden', { status: 403 });
        }

        const staticFile = file(requestedPath);
        if (await staticFile.exists()) {
          return new Response(staticFile);
        }
        return new Response('Not Found', { status: 404 });
      },
    };

    const entryPaths = Array.isArray(entryRoute.route) ? entryRoute.route : [entryRoute.route];
    for (const entryPath of entryPaths) {
      const fullPath = joinPaths(this.basePath, entryPath);
      const method = entryRoute.method.toUpperCase();

      const handler = async () => {
        const { name, params } = entryRoute.handler({
          basePath: this.basePath,
          uiConfig: this.uiConfig,
        });
        const html = await ejs.renderFile(join(viewPath, name), params);
        return new Response(html, { headers: { 'content-type': 'text/html' } });
      };

      routes[fullPath] = { ...routes[fullPath], [method]: handler };
      if (!fullPath.endsWith('/')) {
        routes[`${fullPath}/`] = { ...routes[`${fullPath}/`], [method]: handler };
      }
    }

    for (const route of apiRoutes) {
      const fullPath = joinPaths(this.basePath, route.route);
      const method = route.method.toUpperCase();

      routes[fullPath] = {
        ...routes[fullPath],
        [method]: async (request) => {
          try {
            const url = new URL(request.url);
            const params = (request as { params?: Record<string, string> }).params ?? {};

            const response = await route.handler({
              queues: boardQueues,
              uiConfig: this.uiConfig,
              params,
              query: Object.fromEntries(url.searchParams.entries()),
              body: await parseBody(request),
              headers: Object.fromEntries(request.headers.entries()),
            });

            if (response.status === 204) {
              return new Response(null, { status: 204 });
            }
            return new Response(JSON.stringify(response.body), {
              status: response.status || 200,
              headers: { 'content-type': 'application/json' },
            });
          } catch (error) {
            const response = errorHandler(
              error instanceof Error ? error : new Error(String(error)),
            );
            return new Response(JSON.stringify(response.body), {
              status: response.status || 500,
              headers: { 'content-type': 'application/json' },
            });
          }
        },
      };
    }

    return routes;
  }
}

function joinPaths(...segments: string[]): string {
  const joined = segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

  return `/${joined}`;
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  if (request.method === 'GET') {
    return {};
  }
  try {
    const text = await request.text();
    if (!text) {
      return {};
    }
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}
