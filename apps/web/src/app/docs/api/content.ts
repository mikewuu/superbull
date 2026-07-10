export const intro = `
# REST API

This is the route table \`createBoard()\` mounts under whatever base path you gave
the server adapter (\`/admin/queues\` in the earlier examples). A proxy exposes the
same \`/api/*\` routes behind a bearer token. See [Proxy](/docs/proxy). A hub
forwards \`/s/:sourceId/api/*\` to the matching proxy with its stored token. See
[Hub](/docs/hub).

Bodies and query params use snake_case. Mutations that don't return a resource
respond \`204\` with an empty body; \`POST /add\` is the only route that returns
\`201\` with the created job. Every mutating route responds **405** (not 403) when
the queue was constructed with \`readOnlyMode: true\`.

Validation errors respond \`400\` with \`{ "error": "invalid query" | "invalid body", "issues": [...] }\`
(zod issue list). Unhandled errors respond with the queue-adapter's error
status (default \`500\`) and \`{ "error": "internal server error", "message": string }\`
(\`details\` with a stack trace only when \`NODE_ENV=development\`).

## Global
`;

export const globalHeaders = ['Method', 'Path', 'Query / body', 'Response'];
export const globalRows = [
  [
    'GET',
    '/api/redis/stats',
    '-',
    '{ version, mode, port, os, uptime, memory: {...}, clients: {...} }: from the first queue’s Redis INFO',
  ],
  [
    'GET',
    '/api/prometheus',
    '-',
    'text/plain: one Prometheus block per queue, joined with newlines',
  ],
  [
    'GET',
    '/api/queues',
    'active_queue?, status? (csv), page=1, per_page=10 (max 100), sort=desc, search?',
    '{ queues: AppQueue[] }: only active_queue gets its jobs populated',
  ],
];

export const queueHeaders = ['Method', 'Path', 'Query / body', 'Response'];
export const queueRows = [
  [
    'GET',
    '/api/queues/:queueName/metrics',
    'type=completed|failed, start=0, end=-1',
    'QueueMetrics: native getMetrics(), or a derived fallback if empty',
  ],
  ['GET', '/api/queues/:queueName/job-names', '-', '{ job_names: JobNameStats[] }'],
  ['GET', '/api/queues/:queueName/workers', '-', '{ workers: AppWorker[] }'],
  ['GET', '/api/queues/:queueName/concurrency', '-', '{ global_concurrency, rate_limit_ttl_ms }'],
  ['PUT', '/api/queues/:queueName/concurrency', '{ global_concurrency: number }', '204'],
  ['GET', '/api/queues/:queueName/priorities', '-', '{ priorities: { priority, count }[] }'],
  ['GET', '/api/queues/:queueName/stats', '-', 'QueueStats'],
  ['PUT', '/api/queues/:queueName/pause', '-', '204'],
  ['PUT', '/api/queues/:queueName/resume', '-', '204'],
  ['PUT', '/api/queues/:queueName/empty', '-', '204: drains the queue'],
  ['PUT', '/api/queues/:queueName/drain', '-', '204: drains + removes delayed jobs'],
  ['PUT', '/api/queues/:queueName/obliterate', '-', '204: deletes the queue and all its data'],
  [
    'PUT',
    '/api/queues/:queueName/clean/:status',
    'status: completed|wait|waiting|active|delayed|failed',
    '204: 5s grace window, hardcoded',
  ],
  [
    'PUT',
    '/api/queues/:queueName/retry/:status',
    'status: failed|completed',
    '204: retries every job in that status',
  ],
  ['PUT', '/api/queues/:queueName/promote', '-', '204: promotes every delayed job'],
  [
    'POST',
    '/api/queues/:queueName/add',
    '{ name, data, options: { delay?, attempts?, priority? } | null }',
    '201 { job: AppJob, status }',
  ],
  [
    'POST',
    '/api/queues/:queueName/jobs/bulk',
    '{ action: retry|promote|remove, job_ids: string[] }',
    '204: all-or-nothing',
  ],
];

export const jobHeaders = ['Method', 'Path', 'Query / body', 'Response'];
export const jobRows = [
  ['GET', '/api/queues/:queueName/:jobId', '-', '{ job: AppJob, status }'],
  ['GET', '/api/queues/:queueName/:jobId/logs', '-', '{ logs: string[] }'],
  ['PUT', '/api/queues/:queueName/:jobId/retry', '-', '204'],
  ['PUT', '/api/queues/:queueName/:jobId/promote', '-', '204'],
  [
    'PUT',
    '/api/queues/:queueName/:jobId/clean',
    '-',
    '204: removes the job (name is legacy, calls job.remove())',
  ],
  ['PATCH', '/api/queues/:queueName/:jobId/update-data', '{ data: object }', '204'],
];

export const midMarkdown = `
## Queue

Read-only routes 404 if \`:queueName\` doesn't exist. Mutating routes additionally
405 when the queue adapter has \`readOnlyMode: true\`; retry routes 405 when
\`allowRetries\` (or \`allowCompletedRetries\` for the \`completed\` status) is off.
`;

export const jobHeading = `
## Job

All job routes 404 when the job doesn't exist. \`retry\` 400s if the job isn't in
\`failed\` or \`completed\` state.
`;

export const jobIntro = `
## Bulk actions

\`POST /api/queues/:queueName/jobs/bulk\` validates every \`job_id\` before applying
anything: unknown ids 400 with \`{ error: 'jobs not found', job_ids }\`; ids not in a
state the action allows 400 with \`{ error: 'jobs are not in a state that allows "<action>"', job_ids }\`.
Valid states: \`remove\` matches any status. \`retry\` matches \`failed\`, or
\`completed\` when \`allowCompletedRetries\` is on. \`promote\` matches \`delayed\`
only. Matches every id or none run.

## Response types

\`\`\`ts
interface AppJob {
  id: string | number | null | undefined;
  name: string;
  timestamp: number;
  processed_on?: number | null;
  finished_on?: number | null;
  progress: string | boolean | number | object;
  attempts: number;
  failed_reason: string;
  stacktrace: string[];       // newest attempt first
  delay: number | undefined;
  opts: object;
  data: unknown;               // passed through the format() redaction hook if set
  return_value: unknown;       // passed through the format() redaction hook if set
  is_failed: boolean;
}

interface AppQueue {
  name: string;
  display_name?: string;
  description?: string;
  counts: Record<JobStatus, number>;
  jobs: AppJob[];               // only populated for active_queue
  statuses: QueueStatus[];      // getStatuses(), includes 'latest'
  pagination: { page_count: number; range: { start: number; end: number } };
  read_only_mode: boolean;
  allow_retries: boolean;
  allow_completed_retries: boolean;
  is_paused: boolean;
  worker_count: number;
  oldest_waiting_ms: number | null;
}

interface QueueStats {
  wait_ms: { p50: number | null; p95: number | null };
  run_ms: { p50: number | null; p95: number | null };
  retry_rate: number;
  stalled_count: number;
  failed_count_window: number;
  completed_count_window: number;
  top_errors: { message: string; count: number }[];
  est_drain_ms: number | null;
}

interface QueueMetrics {
  meta: { count: number; prev_ts: number; prev_count: number };
  data: number[];
  count: number;
}

type JobStatus =
  | 'active' | 'waiting' | 'waiting-children' | 'prioritized'
  | 'completed' | 'failed' | 'delayed' | 'paused';
\`\`\`
`;
