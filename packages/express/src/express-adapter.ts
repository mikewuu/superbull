import type {
  AppControllerRoute,
  AppViewRoute,
  BoardQueues,
  HandlerResponse,
  IServerAdapter,
  UIConfig,
} from '@bullwatch/api';
import ejs from 'ejs';
import express, { type Express, type Request, type Response, Router } from 'express';

export class ExpressAdapter implements IServerAdapter {
  protected readonly app: Express;
  protected basePath = '';
  protected boardQueues: BoardQueues | undefined;
  protected errorHandler: ((error: Error) => HandlerResponse) | undefined;
  protected uiConfig: UIConfig = {};

  constructor() {
    this.app = express();
  }

  public setBasePath(path: string): ExpressAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): ExpressAdapter {
    this.app.use(staticsRoute, express.static(staticsPath));
    return this;
  }

  public setViewsPath(viewPath: string): ExpressAdapter {
    this.app.set('view engine', 'ejs').set('views', viewPath);
    this.app.engine('ejs', ejs.renderFile);
    return this;
  }

  public setErrorHandler(handler: (error: Error) => HandlerResponse): ExpressAdapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): ExpressAdapter {
    const { errorHandler, boardQueues } = this;
    if (!errorHandler) {
      throw new Error(`Please call 'setErrorHandler' before 'setApiRoutes'`);
    }
    if (!boardQueues) {
      throw new Error(`Please call 'setQueues' before 'setApiRoutes'`);
    }

    const router = Router();
    router.use(express.json());

    for (const route of routes) {
      router[route.method](route.route, (req: Request, res: Response, next) => {
        this.handleApiRequest(route, req, res).catch(next);
      });
    }

    router.use((error: Error, _req: Request, res: Response, next: express.NextFunction) => {
      if (!this.errorHandler) {
        next();
        return;
      }
      const response = this.errorHandler(error);
      res.status(response.status || 500).send(response.body);
    });

    this.app.use(router);
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): ExpressAdapter {
    const viewHandler = (_req: Request, res: Response) => {
      const { name, params } = routeDef.handler({
        basePath: this.basePath,
        uiConfig: this.uiConfig,
      });
      res.render(name, params);
    };

    this.app[routeDef.method](routeDef.route, viewHandler);
    return this;
  }

  public setQueues(boardQueues: BoardQueues): ExpressAdapter {
    this.boardQueues = boardQueues;
    return this;
  }

  public setUIConfig(config: UIConfig = {}): ExpressAdapter {
    this.uiConfig = config;
    return this;
  }

  public getRouter(): Express {
    return this.app;
  }

  private async handleApiRequest(
    route: AppControllerRoute,
    req: Request,
    res: Response,
  ): Promise<void> {
    if (!this.boardQueues) {
      throw new Error(`Please call 'setQueues' before 'setApiRoutes'`);
    }

    const response = await route.handler({
      queues: this.boardQueues,
      uiConfig: this.uiConfig,
      query: req.query,
      params: flattenParams(req.params),
      body: req.body ?? {},
      headers: req.headers as Record<string, string | undefined>,
    });

    if (response.status === 204) {
      res.status(204).end();
      return;
    }

    if (response.contentType) {
      res
        .status(response.status || 200)
        .type(response.contentType)
        .send(response.body);
      return;
    }

    res.status(response.status || 200).json(response.body);
  }
}

function flattenParams(params: Record<string, string | string[]>): Record<string, string> {
  const entries = Object.entries(params).map(([key, value]) => [
    key,
    Array.isArray(value) ? (value[0] ?? '') : value,
  ]);

  return Object.fromEntries(entries);
}
