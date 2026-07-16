export type AnalyticsRange = '24h' | '7d' | '30d';

export interface ThroughputPoint {
  bucket_ts: number;
  completed: number;
  failed: number;
}

export interface LatencyPoint {
  bucket_ts: number;
  wait_p50: number | null;
  wait_p95: number | null;
  run_p50: number | null;
  run_p95: number | null;
}

export interface QueueTotal {
  queue_name: string;
  completed: number;
  failed: number;
  job_seconds: number | null;
}

export interface HeatmapResult {
  matrix: number[][];
  timezone: 'UTC';
}
