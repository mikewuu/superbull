import axios, { isAxiosError } from 'axios';
import type {
  AppJob,
  AppQueue,
  BulkJobAction,
  JobCleanStatus,
  JobNameStats,
  JobRetryStatus,
  JobStatus,
  MetricsType,
  QueueConcurrency,
  QueueMetrics,
  QueuePriority,
  QueueStats,
  QueueWorker,
  RedisStats,
} from './api-types';
import { readBasePath } from './read-base-path';

const client = axios.create({ baseURL: readBasePath() });

// Non-2xx board API responses carry an {error: string} body (e.g. the hosted
// gateway's 502 {"error":"connector disconnected"}). Surface that string as
// the Error message instead of axios's generic "Request failed with status
// code NNN" so error states can tell the user what actually happened.
// Handler failures (@superbull/api handleError) hardcode `error` to a
// generic string and put the real text in `message` — prefer that when
// present.
client.interceptors.response.use(undefined, (error: unknown) => {
  if (isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (isErrorBody(body)) {
      error.message =
        typeof body.message === 'string' && body.message.length > 0 ? body.message : body.error;
    }
  }
  return Promise.reject(error);
});

function isErrorBody(body: unknown): body is { error: string; message?: unknown } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'string' &&
    (body as { error: string }).error.length > 0
  );
}

// The hosted gateway fails RPCs fast with this exact body when the connector
// has no live WebSocket session; the SPA shows a dedicated recovery state
// for it (polling retries mean it clears on its own once the connector
// reconnects).
export function isConnectorDisconnectedError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  const body: unknown = error.response?.data;
  return isErrorBody(body) && body.error === 'connector disconnected';
}

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

export async function getQueueWorkers(queueName: string): Promise<QueueWorker[]> {
  const response = await client.get<{ workers: QueueWorker[] }>(
    `api/queues/${encodeURIComponent(queueName)}/workers`,
  );
  return response.data.workers;
}

export async function getQueueConcurrency(queueName: string): Promise<QueueConcurrency> {
  const response = await client.get<QueueConcurrency>(
    `api/queues/${encodeURIComponent(queueName)}/concurrency`,
  );
  return response.data;
}

export async function setQueueConcurrency(args: {
  queueName: string;
  globalConcurrency: number;
}): Promise<void> {
  const { queueName, globalConcurrency } = args;
  await client.put(`api/queues/${encodeURIComponent(queueName)}/concurrency`, {
    global_concurrency: globalConcurrency,
  });
}

export async function getQueuePriorities(queueName: string): Promise<QueuePriority[]> {
  const response = await client.get<{ priorities: QueuePriority[] }>(
    `api/queues/${encodeURIComponent(queueName)}/priorities`,
  );
  return response.data.priorities;
}

export async function getQueueStats(queueName: string): Promise<QueueStats> {
  const response = await client.get<QueueStats>(
    `api/queues/${encodeURIComponent(queueName)}/stats`,
  );
  return response.data;
}

export async function drainQueue(queueName: string): Promise<void> {
  await client.put(`api/queues/${encodeURIComponent(queueName)}/drain`);
}

export async function obliterateQueue(queueName: string): Promise<void> {
  await client.put(`api/queues/${encodeURIComponent(queueName)}/obliterate`);
}
