import type {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
  Type,
} from '@nestjs/common';
import type {
  BaseAdapter,
  BoardOptions,
  IServerAdapter,
  QueueAdapterOptions,
  createBoard,
} from '@superbull/api';
import type { Queue } from 'bullmq';

export type Middleware = Type<unknown> | ((...args: unknown[]) => unknown);

export type BoardServerAdapter = IServerAdapter & { setBasePath(path: string): unknown };
export type BoardExpressAdapter = BoardServerAdapter & { getRouter(): unknown };
export type BoardFastifyAdapter = BoardServerAdapter & { registerPlugin(): unknown };

export type BoardInstance = ReturnType<typeof createBoard>;

export type BoardModuleOptions = {
  route: string;
  adapter: new () => BoardServerAdapter;
  boardOptions?: BoardOptions;
  middleware?: Middleware | Middleware[];
};

export type BoardModuleAsyncOptions = {
  // biome-ignore lint/suspicious/noExplicitAny: NestJS injected factory args are heterogeneous; matches Nest's own async-options typing
  useFactory: (...args: any[]) => BoardModuleOptions | Promise<BoardModuleOptions>;
  imports?: ModuleMetadata['imports'];
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
};

type BoardQueueCommonOptions = {
  adapter: new (queue: Queue, options?: Partial<QueueAdapterOptions>) => BaseAdapter;
  options?: Partial<QueueAdapterOptions>;
};

export type BoardQueueOptions = BoardQueueCommonOptions &
  ({ name: string; queue?: undefined } | { queue: Queue; name?: undefined });
