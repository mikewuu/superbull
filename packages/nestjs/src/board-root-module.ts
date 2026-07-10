import {
  type DynamicModule,
  Inject,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  type Provider,
} from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost } from '@nestjs/core';
import { createBoard } from '@superbull/api';
import { boardAdapterToken, boardInstanceToken, boardOptionsToken } from './constants';
import { isExpressAdapter } from './is-express-adapter';
import { isFastifyAdapter } from './is-fastify-adapter';
import type {
  BoardModuleAsyncOptions,
  BoardModuleOptions,
  BoardServerAdapter,
  Middleware,
} from './types';

@Module({})
export class BoardRootModule implements NestModule {
  constructor(
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
    @Inject(ApplicationConfig) private readonly applicationConfig: ApplicationConfig,
    @Inject(boardAdapterToken) private readonly adapter: BoardServerAdapter,
    @Inject(boardOptionsToken) private readonly options: BoardModuleOptions,
  ) {}

  public configure(consumer: MiddlewareConsumer): void {
    const prefix = this.resolveMountPath();
    this.adapter.setBasePath(prefix);
    const middlewares = toMiddlewareList(this.options.middleware);

    if (isExpressAdapter(this.adapter)) {
      const router = this.adapter.getRouter() as (...args: unknown[]) => unknown;
      consumer.apply(...middlewares, router).forRoutes(this.options.route);
      return;
    }

    if (isFastifyAdapter(this.adapter)) {
      this.adapterHost.httpAdapter
        .getInstance()
        .register(this.adapter.registerPlugin(), { prefix });
      consumer.apply(...middlewares).forRoutes(this.options.route);
    }
  }

  private resolveMountPath(): string {
    const route = addLeadingSlash(this.options.route);
    const prefixOptions = this.applicationConfig.getGlobalPrefixOptions();
    const isExcluded = prefixOptions.exclude?.some((exclusion) => exclusion.pathRegex.test(route));

    if (isExcluded) {
      return route;
    }

    return addLeadingSlash(this.applicationConfig.getGlobalPrefix() + this.options.route);
  }

  static forRoot(options: BoardModuleOptions): DynamicModule {
    const serverAdapter = new options.adapter();

    const serverAdapterProvider: Provider = { provide: boardAdapterToken, useValue: serverAdapter };
    const optionsProvider: Provider = { provide: boardOptionsToken, useValue: options };
    const boardProvider: Provider = {
      provide: boardInstanceToken,
      useFactory: () => createBoard({ queues: [], serverAdapter, options: options.boardOptions }),
    };

    return {
      module: BoardRootModule,
      global: true,
      providers: [serverAdapterProvider, optionsProvider, boardProvider],
      exports: [serverAdapterProvider, boardProvider, optionsProvider],
    };
  }

  static forRootAsync(options: BoardModuleAsyncOptions): DynamicModule {
    const serverAdapterProvider: Provider = {
      provide: boardAdapterToken,
      useFactory: (moduleOptions: BoardModuleOptions) => new moduleOptions.adapter(),
      inject: [boardOptionsToken],
    };
    const boardProvider: Provider = {
      provide: boardInstanceToken,
      useFactory: (moduleOptions: BoardModuleOptions, adapter: BoardServerAdapter) =>
        createBoard({ queues: [], serverAdapter: adapter, options: moduleOptions.boardOptions }),
      inject: [boardOptionsToken, boardAdapterToken],
    };
    const optionsProvider: Provider = {
      provide: boardOptionsToken,
      useFactory: options.useFactory,
      inject: options.inject,
    };

    return {
      module: BoardRootModule,
      global: true,
      imports: options.imports,
      providers: [serverAdapterProvider, optionsProvider, boardProvider],
      exports: [serverAdapterProvider, boardProvider, optionsProvider],
    };
  }
}

function addLeadingSlash(path: string): string {
  if (path === '' || path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}

function toMiddlewareList(middleware: Middleware | Middleware[] | undefined): Middleware[] {
  if (!middleware) {
    return [];
  }
  return Array.isArray(middleware) ? middleware : [middleware];
}
