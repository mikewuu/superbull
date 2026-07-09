import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '@bullwatch/api';
import ejs from 'ejs';
import { Elysia } from 'elysia';
import mime from 'mime';

export class ElysiaAdapter implements IServerAdapter {
  private readonly plugin: Elysia<string>;
  private readonly basePath: string;
  private boardQueues: BoardQueues | undefined;
  private statics: { route: string; path: string } | undefined;
  private viewPath: string | undefined;
  private entryRoute: AppViewRoute | undefined;
  private uiConfig: UIConfig = {};

  constructor(options: { prefix?: string; basePath?: string } = {}) {
    this.basePath = options.basePath ?? '';
    this.plugin = new Elysia({ prefix: options.prefix ?? '', name: '@bullwatch/elysia' });
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): ElysiaAdapter {
    this.statics = { route: staticsRoute, path: staticsPath };
    return this;
  }

  public setViewsPath(viewPath: string): ElysiaAdapter {
    this.viewPath = viewPath;
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): ElysiaAdapter {
    this.plugin.onError(({ error, set }) => {
      const response = handler(error instanceof Error ? error : new Error(String(error)));
      set.status = response.status || 500;
      return response.body;
    });
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): ElysiaAdapter {
    const boardQueues = this.boardQueues;
    if (!boardQueues) {
      throw new Error(`Please call 'setQueues' before 'setApiRoutes'`);
    }

    for (const route of routes) {
      this.plugin.route(
        route.method.toUpperCase(),
        route.route,
        async ({ params, query, body, headers }) => {
          const response = await route.handler({
            queues: boardQueues,
            uiConfig: this.uiConfig,
            params: decodeParams(params ?? {}),
            query,
            body: parseBody(body),
            headers,
          });

          if (response.status === 204) {
            return new Response(null, { status: 204 });
          }
          return new Response(JSON.stringify(response.body), {
            status: response.status || 200,
            headers: { 'content-type': 'application/json' },
          });
        },
        { detail: { hide: true } },
      );
    }
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): ElysiaAdapter {
    this.entryRoute = routeDef;
    return this;
  }

  public setQueues(boardQueues: BoardQueues): ElysiaAdapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): ElysiaAdapter {
    this.uiConfig = config;
    return this;
  }

  public async registerPlugin() {
    const { statics, entryRoute, viewPath } = this;
    if (!statics) {
      throw new Error(`Please call 'setStaticPath' before 'registerPlugin'`);
    }
    if (!entryRoute) {
      throw new Error(`Please call 'setEntryRoute' before 'registerPlugin'`);
    }
    if (!viewPath) {
      throw new Error(`Please call 'setViewsPath' before 'registerPlugin'`);
    }

    const entryPaths = Array.isArray(entryRoute.route) ? entryRoute.route : [entryRoute.route];
    for (const entryPath of entryPaths) {
      this.plugin.route(
        entryRoute.method.toUpperCase(),
        entryPath,
        async () => {
          const { name, params } = entryRoute.handler({
            basePath: this.basePath,
            uiConfig: this.uiConfig,
          });
          const html = await ejs.renderFile(path.join(viewPath, name), params);
          return new Response(html, { headers: { 'content-type': 'text/html' } });
        },
        { detail: { hide: true } },
      );
    }

    const staticsRoot = path.resolve(statics.path);
    const filePaths = await listFiles(staticsRoot);
    for (const filePath of filePaths) {
      const route = `${statics.route}/${path.relative(staticsRoot, filePath).replaceAll('\\', '/')}`;
      this.plugin.get(
        route,
        async () =>
          new Response(await readFile(filePath), {
            headers: { 'content-type': mime.getType(filePath) ?? 'text/plain' },
          }),
        { detail: { hide: true } },
      );
    }

    return this.plugin.as('scoped');
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }
      return Promise.resolve([fullPath]);
    }),
  );
  return nested.flat();
}

function decodeParams(params: Record<string, string>): Record<string, string> {
  const entries = Object.entries(params).map(([key, value]) => [key, decodeURIComponent(value)]);

  return Object.fromEntries(entries);
}

function parseBody(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object') {
    return body as Record<string, unknown>;
  }
  return {};
}
