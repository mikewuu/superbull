import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  HTTPMethod,
  IServerAdapter,
  UIConfig,
} from '@bullwatch/api';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import ejs from 'ejs';
import type { FastifyInstance, FastifyPluginCallback, HTTPMethods } from 'fastify';

const httpMethods: Record<HTTPMethod, HTTPMethods> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
};

export class FastifyAdapter implements IServerAdapter {
  protected basePath = '';
  protected boardQueues: BoardQueues | undefined;
  protected errorHandler: ((error: Error) => HandlerResponse) | undefined;
  protected statics: { path: string; route: string } | undefined;
  protected viewsPath: string | undefined;
  protected entryRoute: AppViewRoute | undefined;
  protected apiRoutes: AppControllerRoute[] | undefined;
  protected uiConfig: UIConfig = {};

  public setBasePath(path: string): FastifyAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): FastifyAdapter {
    this.statics = { route: staticsRoute, path: staticsPath };
    return this;
  }

  public setViewsPath(viewPath: string): FastifyAdapter {
    this.viewsPath = viewPath;
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): FastifyAdapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): FastifyAdapter {
    this.apiRoutes = routes;
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): FastifyAdapter {
    this.entryRoute = routeDef;
    return this;
  }

  public setQueues(boardQueues: BoardQueues): FastifyAdapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): FastifyAdapter {
    this.uiConfig = config;
    return this;
  }

  public registerPlugin(): FastifyPluginCallback<{ prefix?: string }> {
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

    return (fastify, opts, done) => {
      if (opts.prefix && !this.basePath) {
        this.basePath = opts.prefix;
      }

      fastify.register(fastifyView, { engine: { ejs }, root: viewsPath });
      fastify.register(fastifyStatic, { root: statics.path, prefix: statics.route });

      this.addEntryRoute(fastify, entryRoute);
      for (const route of apiRoutes) {
        this.addApiRoute(fastify, route, boardQueues);
      }

      fastify.setErrorHandler((error, _request, reply) => {
        const response = errorHandler(error);
        reply.status(response.status || 500).send(response.body);
      });

      done();
    };
  }

  private addEntryRoute(fastify: FastifyInstance, entryRoute: AppViewRoute): void {
    const paths = Array.isArray(entryRoute.route) ? entryRoute.route : [entryRoute.route];

    for (const url of paths) {
      fastify.route({
        method: httpMethods[entryRoute.method],
        url,
        handler: (_request, reply) => {
          const view = entryRoute.handler({ basePath: this.basePath, uiConfig: this.uiConfig });
          return reply.view(view.name, view.params);
        },
      });
    }
  }

  private addApiRoute(
    fastify: FastifyInstance,
    route: AppControllerRoute,
    boardQueues: BoardQueues,
  ): void {
    fastify.route({
      method: httpMethods[route.method],
      url: route.route,
      handler: async (request, reply) => {
        const response = await route.handler({
          queues: boardQueues,
          uiConfig: this.uiConfig,
          query: (request.query ?? {}) as Record<string, unknown>,
          params: (request.params ?? {}) as Record<string, string>,
          body: (request.body ?? {}) as Record<string, unknown>,
          headers: request.headers as Record<string, string | undefined>,
        });

        if (response.status === 204) {
          return reply.status(204).send();
        }

        return reply.status(response.status || 200).send(response.body);
      },
    });
  }
}
