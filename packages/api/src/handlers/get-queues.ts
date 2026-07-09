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

const querySchema = z.object({
  active_queue: z.string().optional(),
  status: z.enum(['latest', ...jobStatuses]).optional(),
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
  const queues = await Promise.all(
    [...req.queues.entries()].map(([queueName, queue]) => toAppQueue(queueName, queue, query)),
  );

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
  const statuses =
    !isActiveQueue || !query.status || query.status === 'latest'
      ? queue.getJobStatuses()
      : [query.status];
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
    jobs: jobs.map(formatJob),
    statuses: queue.getStatuses(),
    pagination,
    read_only_mode: queue.readOnlyMode,
    allow_retries: queue.allowRetries,
    allow_completed_retries: queue.allowCompletedRetries,
    is_paused: isPaused,
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
    const jobs = await queue.getJobs(statuses, pagination.range.start, pagination.range.end, asc);
    return { jobs, pagination };
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
  const [firstStatus] = statuses;

  if (statuses.length === 1 && firstStatus) {
    const start = (page - 1) * perPage;
    return {
      page_count: Math.ceil(counts[firstStatus] / perPage),
      range: { start, end: start + perPage - 1 },
    };
  }

  return { page_count: 1, range: { start: 0, end: perPage - 1 } };
}
