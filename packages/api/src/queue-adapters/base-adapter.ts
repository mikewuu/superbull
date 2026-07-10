import type {
  JobCleanStatus,
  JobStatus,
  MetricsType,
  QueueAdapterOptions,
  QueueJob,
  QueueJobOptions,
  QueueMetrics,
  QueueStatus,
} from '../types';

export abstract class BaseAdapter {
  public readonly readOnlyMode: boolean;
  public readonly allowRetries: boolean;
  public readonly allowCompletedRetries: boolean;
  public readonly prefix: string;
  public readonly description: string;
  public readonly displayName: string;

  protected constructor(options: Partial<QueueAdapterOptions> = {}) {
    this.readOnlyMode = options.readOnlyMode === true;
    this.allowRetries = this.readOnlyMode ? false : options.allowRetries !== false;
    this.allowCompletedRetries = this.allowRetries && options.allowCompletedRetries !== false;
    this.prefix = options.prefix || '';
    this.description = options.description || '';
    this.displayName = options.displayName || '';
  }

  public abstract getName(): string;

  public abstract getRedisInfo(): Promise<string>;

  public abstract addJob(
    jobName: string,
    data: unknown,
    options: QueueJobOptions,
  ): Promise<QueueJob>;

  public abstract findJob(jobId: string): Promise<QueueJob | null>;

  public abstract getJobs(
    statuses: JobStatus[],
    start?: number,
    end?: number,
    asc?: boolean,
  ): Promise<QueueJob[]>;

  public abstract getJobCounts(): Promise<Record<JobStatus, number>>;

  public abstract getJobLogs(jobId: string): Promise<string[]>;

  public abstract getMetrics(
    type: MetricsType,
    start?: number,
    end?: number,
  ): Promise<QueueMetrics>;

  public abstract getWorkerCount(): Promise<number>;

  public abstract findOldestWaitingJobTimestamp(): Promise<number | null>;

  public abstract isPaused(): Promise<boolean>;

  public abstract pause(): Promise<void>;

  public abstract resume(): Promise<void>;

  public abstract empty(): Promise<void>;

  public abstract clean(status: JobCleanStatus, graceTimeMs: number): Promise<void>;

  public abstract promoteAll(): Promise<void>;

  public abstract getStatuses(): QueueStatus[];

  public abstract getJobStatuses(): JobStatus[];
}
