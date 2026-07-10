import { Queue } from 'bullmq';
import {
  type JobCleanStatus,
  type JobStatus,
  type MetricsType,
  type QueueAdapterOptions,
  type QueueJob,
  type QueueJobOptions,
  type QueueMetrics,
  type QueueStatus,
  jobStatuses,
} from '../types';
import { BaseAdapter } from './base-adapter';

export class BullMQAdapter extends BaseAdapter {
  constructor(
    private queue: Queue,
    options: Partial<QueueAdapterOptions> = {},
  ) {
    super(options);
    const isBullMQQueue =
      queue instanceof Queue || `${(queue as Queue).metaValues?.version}`.startsWith('bullmq');
    if (!isBullMQQueue) {
      throw new Error("You've used the BullMQ adapter with a non-BullMQ queue.");
    }
  }

  public getName(): string {
    return `${this.prefix}${this.queue.name}`;
  }

  public async getRedisInfo(): Promise<string> {
    const client = await this.queue.client;
    return client.info();
  }

  public async addJob(jobName: string, data: unknown, options: QueueJobOptions) {
    const job = await this.queue.add(jobName, data, options);
    return job as QueueJob;
  }

  public async findJob(jobId: string): Promise<QueueJob | null> {
    const job = await this.queue.getJob(jobId);
    return (job as QueueJob | undefined) ?? null;
  }

  public async getJobs(
    statuses: JobStatus[],
    start?: number,
    end?: number,
    asc?: boolean,
  ): Promise<QueueJob[]> {
    const jobs = await this.queue.getJobs(statuses, start, end, asc);
    return jobs.filter(Boolean) as QueueJob[];
  }

  public async getJobCounts(): Promise<Record<JobStatus, number>> {
    const counts = await this.queue.getJobCounts(...jobStatuses);
    return counts as Record<JobStatus, number>;
  }

  public getJobLogs(jobId: string): Promise<string[]> {
    return this.queue.getJobLogs(jobId).then(({ logs }) => logs);
  }

  public async getMetrics(type: MetricsType, start?: number, end?: number): Promise<QueueMetrics> {
    const metrics = await this.queue.getMetrics(type, start, end);
    return {
      meta: {
        count: metrics.meta.count,
        prev_ts: metrics.meta.prevTS,
        prev_count: metrics.meta.prevCount,
      },
      data: metrics.data,
      count: metrics.count,
    };
  }

  public isPaused(): Promise<boolean> {
    return this.queue.isPaused();
  }

  public getWorkerCount(): Promise<number> {
    return this.queue.getWorkersCount();
  }

  public async findOldestWaitingJobTimestamp(): Promise<number | null> {
    const [oldest] = await this.queue.getJobs(['waiting'], 0, 0, true);
    if (!oldest) {
      return null;
    }
    return oldest.timestamp ?? null;
  }

  public pause(): Promise<void> {
    return this.queue.pause();
  }

  public resume(): Promise<void> {
    return this.queue.resume();
  }

  public empty(): Promise<void> {
    return this.queue.drain();
  }

  public async clean(status: JobCleanStatus, graceTimeMs: number): Promise<void> {
    await this.queue.clean(graceTimeMs, Number.MAX_SAFE_INTEGER, status);
  }

  public promoteAll(): Promise<void> {
    return this.queue.promoteJobs();
  }

  public getStatuses(): QueueStatus[] {
    return ['latest', ...jobStatuses];
  }

  public getJobStatuses(): JobStatus[] {
    return [...jobStatuses];
  }
}
