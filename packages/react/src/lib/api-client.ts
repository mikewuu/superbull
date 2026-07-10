import axios from 'axios';
import type {
  AppJob,
  AppQueue,
  BulkJobAction,
  JobCleanStatus,
  JobNameStats,
  JobRetryStatus,
  JobStatus,
  MetricsType,
  QueueMetrics,
  RedisStats,
} from './api-types';
import { readBasePath } from './read-base-path';

const client = axios.create({ baseURL: readBasePath() });

export interface GetQueuesParams {
  activeQueue?: string;
  status?: string;
  page?: number;
  perPage?: number;
  sort?: 'asc' | 'desc';
  search?: string;
}

export async function getQueues(params: GetQueuesParams): Promise<AppQueue[]> {
  const response = await client.get<{ queues: AppQueue[] }>('api/queues', {
    params: {
      active_queue: params.activeQueue,
      status: params.status,
      page: params.page,
      per_page: params.perPage,
      sort: params.sort,
      search: params.search,
    },
  });
  return response.data.queues;
}

export async function getJob(args: {
  queueName: string;
  jobId: string;
}): Promise<{ job: AppJob; status: JobStatus }> {
  const { queueName, jobId } = args;
  const response = await client.get<{ job: AppJob; status: JobStatus }>(
    `api/queues/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`,
  );
  return response.data;
}

export async function getJobLogs(args: { queueName: string; jobId: string }): Promise<string[]> {
  const { queueName, jobId } = args;
  const response = await client.get<{ logs: string[] }>(
    `api/queues/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/logs`,
  );
  return response.data.logs;
}

export async function getQueueMetrics(args: {
  queueName: string;
  type: MetricsType;
}): Promise<QueueMetrics> {
  const { queueName, type } = args;
  const response = await client.get<QueueMetrics>(
    `api/queues/${encodeURIComponent(queueName)}/metrics`,
    { params: { type } },
  );
  return response.data;
}

export async function getJobNames(queueName: string): Promise<JobNameStats[]> {
  const response = await client.get<{ job_names: JobNameStats[] }>(
    `api/queues/${encodeURIComponent(queueName)}/job-names`,
  );
  return response.data.job_names;
}

export async function getRedisStats(): Promise<RedisStats> {
  const response = await client.get<RedisStats>('api/redis/stats');
  return response.data;
}

export async function pauseQueue(queueName: string): Promise<void> {
  await client.put(`api/queues/${encodeURIComponent(queueName)}/pause`);
}

export async function resumeQueue(queueName: string): Promise<void> {
  await client.put(`api/queues/${encodeURIComponent(queueName)}/resume`);
}

export async function emptyQueue(queueName: string): Promise<void> {
  await client.put(`api/queues/${encodeURIComponent(queueName)}/empty`);
}

export async function cleanQueue(args: {
  queueName: string;
  status: JobCleanStatus;
}): Promise<void> {
  const { queueName, status } = args;
  await client.put(`api/queues/${encodeURIComponent(queueName)}/clean/${status}`);
}

export async function retryQueueJobs(args: {
  queueName: string;
  status: JobRetryStatus;
}): Promise<void> {
  const { queueName, status } = args;
  await client.put(`api/queues/${encodeURIComponent(queueName)}/retry/${status}`);
}

export async function promoteQueueJobs(queueName: string): Promise<void> {
  await client.put(`api/queues/${encodeURIComponent(queueName)}/promote`);
}

export async function retryJob(args: { queueName: string; jobId: string }): Promise<void> {
  const { queueName, jobId } = args;
  await client.put(
    `api/queues/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/retry`,
  );
}

export async function promoteJob(args: { queueName: string; jobId: string }): Promise<void> {
  const { queueName, jobId } = args;
  await client.put(
    `api/queues/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/promote`,
  );
}

export async function removeJob(args: { queueName: string; jobId: string }): Promise<void> {
  const { queueName, jobId } = args;
  await client.put(
    `api/queues/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/clean`,
  );
}

export async function updateJobData(args: {
  queueName: string;
  jobId: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const { queueName, jobId, data } = args;
  await client.patch(
    `api/queues/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/update-data`,
    { data },
  );
}

export async function addJob(args: {
  queueName: string;
  name: string;
  data: unknown;
  options: { delay?: number; attempts?: number; priority?: number } | null;
}): Promise<{ job: AppJob; status: JobStatus }> {
  const { queueName, name, data, options } = args;
  const response = await client.post<{ job: AppJob; status: JobStatus }>(
    `api/queues/${encodeURIComponent(queueName)}/add`,
    { name, data, options },
  );
  return response.data;
}

export async function applyBulkJobAction(args: {
  queueName: string;
  action: BulkJobAction;
  jobIds: string[];
}): Promise<void> {
  const { queueName, action, jobIds } = args;
  await client.post(`api/queues/${encodeURIComponent(queueName)}/jobs/bulk`, {
    action,
    job_ids: jobIds,
  });
}
