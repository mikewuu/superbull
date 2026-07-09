import type { BaseAdapter } from './queue-adapters/base-adapter';

export const jobStatuses = [
  'active',
  'waiting',
  'waiting-children',
  'prioritized',
  'completed',
  'failed',
  'delayed',
  'paused',
] as const;

export type JobStatus = (typeof jobStatuses)[number];
export type QueueStatus = JobStatus | 'latest';
export type JobCleanStatus = 'completed' | 'wait' | 'active' | 'delayed' | 'failed';
export type JobRetryStatus = 'completed' | 'failed';
export type MetricsType = 'completed' | 'failed';

export interface QueueAdapterOptions {
  readOnlyMode: boolean;
  allowRetries: boolean;
  allowCompletedRetries: boolean;
  prefix: string;
  description: string;
  displayName: string;
}

export type BoardQueues = Map<string, BaseAdapter>;

export interface QueueJob {
  opts: {
    delay?: number | undefined;
  };

  promote(): Promise<void>;

  remove(): Promise<void>;

  retry(state?: JobRetryStatus): Promise<void>;

  getState(): Promise<string>;

  updateData(jobData: Record<string, unknown>): Promise<void>;

  toJSON(): QueueJobJson;
}

export interface QueueJobJson {
  id?: string | number | null;
  name: string;
  progress: string | boolean | number | object;
  attemptsMade: number;
  finishedOn?: number | null;
  processedOn?: number | null;
  delay?: number;
  timestamp: number;
  failedReason: string;
  stacktrace: string[] | null;
  data: unknown;
  returnvalue: unknown;
  opts: object;
}

export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  priority?: number;
}

export interface QueueMetrics {
  meta: {
    count: number;
    prev_ts: number;
    prev_count: number;
  };
  data: number[];
  count: number;
}

export interface AppJob {
  id: QueueJobJson['id'];
  name: string;
  timestamp: number;
  processed_on?: number | null;
  finished_on?: number | null;
  progress: QueueJobJson['progress'];
  attempts: number;
  failed_reason: string;
  stacktrace: string[];
  delay: number | undefined;
  opts: object;
  data: unknown;
  return_value: unknown;
  is_failed: boolean;
}

export interface Pagination {
  page_count: number;
  range: {
    start: number;
    end: number;
  };
}

export interface AppQueue {
  name: string;
  display_name?: string;
  description?: string;
  counts: Record<JobStatus, number>;
  jobs: AppJob[];
  statuses: QueueStatus[];
  pagination: Pagination;
  read_only_mode: boolean;
  allow_retries: boolean;
  allow_completed_retries: boolean;
  is_paused: boolean;
}

export type UIConfig = Partial<{
  board_title: string;
  polling_interval_ms: number;
}>;

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch';
export type HTTPStatus = 200 | 201 | 204 | 400 | 403 | 404 | 405 | 500;

export interface BoardRequest {
  queues: BoardQueues;
  uiConfig: UIConfig;
  query: Record<string, unknown>;
  params: Record<string, string>;
  body: Record<string, unknown>;
  headers: Record<string, string | undefined>;
}

export type HandlerResponse = {
  status?: HTTPStatus;
  body: string | object;
};

export type ViewResponse = {
  name: string;
  params: Record<string, string>;
};

export type Promisify<T> = T | Promise<T>;

export interface AppControllerRoute {
  method: HTTPMethod;
  route: string;

  handler(request: BoardRequest): Promisify<HandlerResponse>;
}

export interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];

  handler(params: { basePath: string; uiConfig: UIConfig }): ViewResponse;
}

export type AppRouteDefs = {
  entryPoint: AppViewRoute;
  api: AppControllerRoute[];
};

export interface IServerAdapter {
  setQueues(boardQueues: BoardQueues): IServerAdapter;

  setViewsPath(viewPath: string): IServerAdapter;

  setStaticPath(staticsRoute: string, staticsPath: string): IServerAdapter;

  setEntryRoute(route: AppViewRoute): IServerAdapter;

  setErrorHandler(handler: (error: Error) => HandlerResponse): IServerAdapter;

  setApiRoutes(routes: AppControllerRoute[]): IServerAdapter;

  setUIConfig(config: UIConfig): IServerAdapter;
}

export type BoardOptions = {
  uiBasePath?: string;
  uiConfig?: UIConfig;
};
