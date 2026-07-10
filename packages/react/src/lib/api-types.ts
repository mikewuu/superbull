import type { JobStatus } from '@bullwatch/ui';

export { jobStatuses } from '@bullwatch/ui';
export type { JobStatus };

export type QueueStatus = JobStatus | 'latest';
export type JobCleanStatus = 'completed' | 'waiting' | 'active' | 'delayed' | 'failed';
export type JobRetryStatus = 'completed' | 'failed';
export type MetricsType = 'completed' | 'failed';
export type BulkJobAction = 'retry' | 'promote' | 'remove';

export interface AppJob {
  id?: string | number | null;
  name: string;
  timestamp: number;
  processed_on?: number | null;
  finished_on?: number | null;
  progress: string | boolean | number | object;
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
  worker_count: number;
  oldest_waiting_ms: number | null;
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

export interface RedisStats {
  version?: string;
  mode?: string;
  port?: number;
  os?: string;
  uptime?: number;
  memory?: {
    total: number;
    used: number;
    fragmentation_ratio: number;
    peak: number;
  };
  clients?: {
    connected: number;
    blocked: number;
  };
}

export type UIConfig = Partial<{
  board_title: string;
  polling_interval_ms: number;
}>;

export interface JobNameStats {
  name: string;
  completed_count: number;
  failed_count: number;
  pending_count: number;
  failure_rate: number;
  avg_duration_ms: number | null;
  last_seen_ms: number;
  activity: number[];
}
