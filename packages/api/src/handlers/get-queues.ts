import { z } from 'zod';
import { formatJob } from '../format-job';
import type { BaseAdapter } from '../queue-adapters/base-adapter';
import {
  type AppQueue,
  type BoardRequest,
  type HandlerResponse,
  type JobStatus,
  type Pagination,
  type QueueJob,
  jobStatuses,
} from '../types';

const statusListSchema = z
  .string()
  .transform((value) => value.split(',').filter(Boolean))
  .pipe(z.array(z.enum(['latest', ...jobStatuses])));

const querySchema = z.object({
  active_queue: z.string().optional(),
  status: statusListSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(10),
  sort: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

type QueuesQuery = z.infer<typeof querySchema>;

export async function getQueues(req: BoardRequest): Promise<HandlerResponse> {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid query', issues: parsed.error.issues } };
  }

  const query = parsed.data;
  // One broken or mid-obliterate queue must not blank the whole dashboard,
  // but a total failure should still surface as an error.
  const results = await Promise.allSettled(
    [...req.queues.entries()].map(([queueName, queue]) => toAppQueue(queueName, queue, query)),
  );
  const queues = results
    .filter((result): result is PromiseFulfilledResult<AppQueue> => result.status === 'fulfilled')
    .map((result) => result.value);
  const firstFailure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (queues.length === 0 && firstFailure) {
    throw firstFailure.reason;
  }

  return { body: { queues } };
}

async function toAppQueue(
  queueName: string,
  queue: BaseAdapter,
  query: QueuesQuery,
): Promise<AppQueue> {
  const isActiveQueue = query.active_queue === queueName;
  const counts = await queue.getJobCounts();
  const isPaused = await queue.isPaused();
  const workerCount = await queue.getWorkerCount();
  const oldestWaitingTimestamp = await queue.findOldestWaitingJobTimestamp();
  const selectedStatuses = (query.status ?? []).filter(
    (value): value is JobStatus => value !== 'latest',
  );
  const statuses =
    !isActiveQueue || selectedStatuses.length === 0 ? queue.getJobStatuses() : selectedStatuses;
  const { jobs, pagination } = await getJobPage({
    queue,
    statuses,
    counts,
    query,
    withJobs: isActiveQueue,
  });

  return {
    name: queueName,
    display_name: queue.displayName || undefined,
    description: queue.description || undefined,
    counts,
    jobs: jobs.map((job) => formatJob(job, queue.format)),
    statuses: queue.getStatuses(),
    pagination,
    read_only_mode: queue.readOnlyMode,
    allow_retries: queue.allowRetries,
    allow_completed_retries: queue.allowCompletedRetries,
    is_paused: isPaused,
    worker_count: workerCount,
    oldest_waiting_ms:
      oldestWaitingTimestamp === null ? null : Math.max(0, Date.now() - oldestWaitingTimestamp),
  };
}

async function getJobPage(args: {
  queue: BaseAdapter;
  statuses: JobStatus[];
  counts: Record<JobStatus, number>;
  query: QueuesQuery;
  withJobs: boolean;
}): Promise<{ jobs: QueueJob[]; pagination: Pagination }> {
  const { queue, statuses, counts, query, withJobs } = args;
  const pagination = getPagination(statuses, counts, query.page, query.per_page);

  if (!withJobs) {
    return { jobs: [], pagination };
  }

  const asc = query.sort === 'asc';

  if (!query.search) {
    const fetched = await queue.getJobs(
      statuses,
      pagination.range.start,
      pagination.range.end,
      asc,
    );
    return { jobs: capToPageSize(fetched, query.per_page, asc), pagination };
  }

  const matching = await searchJobs({ queue, statuses, search: query.search, asc });
  const start = (query.page - 1) * query.per_page;

  return {
    jobs: matching.slice(start, start + query.per_page),
    pagination: {
      page_count: Math.ceil(matching.length / query.per_page),
      range: { start, end: start + query.per_page - 1 },
    },
  };
}

// BullMQ's getJobs returns up to a full range per status, so a multi-status
// fetch can exceed the page size; sort across statuses and cap to one page.
function capToPageSize(jobs: QueueJob[], perPage: number, asc: boolean): QueueJob[] {
  if (jobs.length <= perPage) {
    return jobs;
  }
  const sorted = [...jobs].sort((a, b) => {
    const delta = a.toJSON().timestamp - b.toJSON().timestamp;
    return asc ? delta : -delta;
  });
  return sorted.slice(0, perPage);
}

// Search scans a bounded window of recent jobs rather than the whole queue.
const searchWindowSize = 1000;

async function searchJobs(args: {
  queue: BaseAdapter;
  statuses: JobStatus[];
  search: string;
  asc: boolean;
}): Promise<QueueJob[]> {
  const { queue, statuses, search, asc } = args;
  const window = await queue.getJobs(statuses, 0, searchWindowSize - 1, asc);
  const term = search.toLowerCase();

  return window.filter((job) => {
    const { id, name } = job.toJSON();
    return `${id}`.toLowerCase().includes(term) || name.toLowerCase().includes(term);
  });
}

function getPagination(
  statuses: JobStatus[],
  counts: Record<JobStatus, number>,
  page: number,
  perPage: number,
): Pagination {
  const isFiltered = statuses.length < jobStatuses.length;

  if (isFiltered) {
    const total = statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
    const start = (page - 1) * perPage;
    return {
      page_count: Math.max(1, Math.ceil(total / perPage)),
      range: { start, end: start + perPage - 1 },
    };
  }

  return { page_count: 1, range: { start: 0, end: perPage - 1 } };
}
