export const intro = `
# REST API

This is the route table \`createBoard()\` mounts under whatever base path you gave
the server adapter (\`/admin/queues\` in the earlier examples). It is the same
surface everywhere SuperBull runs: a standalone board serves it directly from
your process, and a connector resolves the same routes in-process against your
queues when the hosted app forwards a dashboard request to it. See
[Connector](/docs/connector) and [Hosted app](/docs/hub).

Conventions, stated once:

- Bodies and query params use snake_case.
- Mutations that don't return a resource respond \`204\` with an empty body.
  \`POST /add\` is the only route that returns \`201\` (the created job).
- \`404 { "error": "queue not found" }\` on every route whose \`:queueName\`
  doesn't resolve; \`404 { "error": "job not found" }\` on job routes whose
  \`:jobId\` doesn't. Exception: \`GET .../:jobId/logs\` returns \`{ "logs": [] }\`
  for an unknown job instead of a 404.
- Every mutating route responds \`405 { "error": "queue is read-only" }\` (not
  403) when the queue was constructed with \`readOnlyMode: true\`. Retry routes
  respond \`405 { "error": "retries are disabled for this queue" }\` when
  \`allowRetries\` is off, and \`405 { "error": "completed retries are disabled
  for this queue" }\` for the \`completed\` status when \`allowCompletedRetries\`
  is off. See [Configuration](/docs/configuration) for those options.
- Query-string and body validation errors respond \`400\` with
  \`{ "error": "invalid query" | "invalid request body", "issues": [...] }\`
  (the zod issue list). Path-param validation (the \`:status\` segment of the
  retry and clean routes) responds \`400\` with a bespoke \`{ "error": ... }\`
  body and no \`issues\`.
- Unhandled errors respond with the thrown error's \`statusCode\` (default
  \`500\`) and \`{ "error": "internal server error", "message": string }\`;
  \`details\` carries the stack trace only when \`NODE_ENV=development\`.

## Entry routes

\`GET /\`, \`GET /queue/:queueName\`, and \`GET /queue/:queueName/:jobId\` all serve
the dashboard SPA shell (title from \`uiConfig.board_title\`); the SPA's static
assets are mounted under \`/static\`. Everything under \`/api/...\` is JSON.

## Global
`;

export const globalHeaders = ['Method', 'Path', 'Query / body', 'Response'];
export const globalRows = [
  [
    'GET',
    '/api/redis/stats',
    '-',
    "{ version, mode, port, os, uptime, memory: {...}, clients: {...} }: parsed from the first queue's Redis INFO; {} when no queues are mounted",
  ],
  [
    'GET',
    '/api/prometheus',
    '-',
    'text/plain: one Prometheus exposition block per queue, joined with newlines',
  ],
  [
    'GET',
    '/api/queues',
    'active_queue?, status? (csv of latest + job statuses), page=1, per_page=10 (max 100), sort=asc|desc (default desc), search?',
    '{ queues: AppQueue[] }: only active_queue gets its jobs populated; search scans a 1000-job window by id/name following the requested sort (the 1000 most recent with the default sort=desc, the 1000 oldest with sort=asc); a queue that errors mid-listing is dropped rather than failing the whole response, unless every queue errors, which 500s',
  ],
];

export const midMarkdown = `
## Queue

Every route below 404s if \`:queueName\` doesn't exist. Mutating routes (every
PUT/POST here) additionally 405 when the queue adapter has \`readOnlyMode:
true\`; the two retry routes 405 when \`allowRetries\` is off (or, for the
\`completed\` status, when \`allowCompletedRetries\` is off).
`;

export const queueHeaders = ['Method', 'Path', 'Query / body', 'Response'];
export const queueRows = [
  [
    'GET',
    '/api/queues/:queueName/metrics',
    'type=completed|failed (default completed), start=0, end=-1',
    "QueueMetrics: BullMQ's native getMetrics() counts, or a fallback derived from the last 1000 finished jobs (60 one-minute buckets) when metrics collection isn't enabled",
  ],
  [
    'GET',
    '/api/queues/:queueName/job-names',
    '-',
    '{ job_names: JobNameStats[] }: per-name counts, failure rate, avg duration, 24h activity buckets; scans the last 1000 completed + 1000 failed + 500 pending jobs, sorted by last_seen_ms desc',
  ],
  ['GET', '/api/queues/:queueName/workers', '-', '{ workers: AppWorker[] }'],
  [
    'GET',
    '/api/queues/:queueName/concurrency',
    '-',
    '{ global_concurrency: number | null, rate_limit_ttl_ms: number | null }',
  ],
  ['PUT', '/api/queues/:queueName/concurrency', '{ global_concurrency: int > 0 }', '204'],
  [
    'GET',
    '/api/queues/:queueName/priorities',
    '-',
    '{ priorities: { priority, count }[] } sorted ascending; scans up to 500 prioritized jobs',
  ],
  [
    'GET',
    '/api/queues/:queueName/stats',
    '-',
    'QueueStats: percentiles and error rollups over the last 1000 completed + 1000 failed jobs; drain estimate from a 10-minute throughput window',
  ],
  ['PUT', '/api/queues/:queueName/pause', '-', '204'],
  ['PUT', '/api/queues/:queueName/resume', '-', '204'],
  ['PUT', '/api/queues/:queueName/empty', '-', '204: removes waiting jobs'],
  ['PUT', '/api/queues/:queueName/drain', '-', '204: removes waiting and delayed jobs'],
  [
    'PUT',
    '/api/queues/:queueName/obliterate',
    '-',
    '204: force-deletes the queue and all of its data',
  ],
  [
    'PUT',
    '/api/queues/:queueName/clean/:status',
    'status: completed|wait|waiting|active|delayed|failed (waiting normalizes to wait); anything else 400s',
    '204: removes jobs in that status older than a hardcoded 5s grace window',
  ],
  [
    'PUT',
    '/api/queues/:queueName/retry/:status',
    'status: failed|completed; anything else 400s',
    '204: retries every job currently in that status',
  ],
  ['PUT', '/api/queues/:queueName/promote', '-', '204: promotes every delayed job'],
  [
    'POST',
    '/api/queues/:queueName/add',
    '{ name: string, data: unknown, options: { delay?: int >= 0, attempts?: int > 0, priority?: int } | null }: options is required but may be null',
    '201 { job: AppJob, status }',
  ],
  [
    'POST',
    '/api/queues/:queueName/jobs/bulk',
    '{ action: "retry"|"promote"|"remove", job_ids: (string | number)[] } (min 1 id)',
    '204: all-or-nothing, see Bulk actions below',
  ],
];

export const jobHeading = `
## Job

All job routes 404 when the job doesn't exist, except \`logs\` (empty list).
\`retry\` 400s with \`{ "error": "job is in \\"<state>\\" state and cannot be
retried" }\` if the job isn't in \`failed\` or \`completed\` state, and 405s for
\`completed\` jobs when \`allowCompletedRetries\` is off.
`;

export const jobHeaders = ['Method', 'Path', 'Query / body', 'Response'];
export const jobRows = [
  ['GET', '/api/queues/:queueName/:jobId', '-', '{ job: AppJob, status }'],
  [
    'GET',
    '/api/queues/:queueName/:jobId/logs',
    '-',
    '{ logs: string[] }: empty for unknown jobs, never 404',
  ],
  ['PUT', '/api/queues/:queueName/:jobId/retry', '-', '204'],
  ['PUT', '/api/queues/:queueName/:jobId/promote', '-', '204: the job must be delayed'],
  [
    'PUT',
    '/api/queues/:queueName/:jobId/clean',
    '-',
    '204: removes the job (the name is legacy; it calls job.remove())',
  ],
  [
    'PATCH',
    '/api/queues/:queueName/:jobId/update-data',
    '{ data: Record<string, unknown> }',
    '204',
  ],
];

export const jobIntro = `
## Bulk actions

\`POST /api/queues/:queueName/jobs/bulk\` validates every \`job_id\` before
applying anything: unknown ids 400 with \`{ "error": "jobs not found", job_ids }\`
(only the missing ids); ids not in a state the action allows 400 with
\`{ "error": "jobs are not in a state that allows \\"<action>\\"", job_ids }\`.
\`action: "retry"\` additionally responds
\`405 { "error": "retries are disabled for this queue" }\` when \`allowRetries\`
is off. Valid states: \`remove\` matches any status; \`retry\` matches \`failed\`, plus
\`completed\` when \`allowCompletedRetries\` is on; \`promote\` matches \`delayed\`
only. Either every id matches or nothing runs.

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

interface AppWorker {
  id?: string;
  name?: string;
  addr?: string;
  started_ms?: number;
}

interface JobNameStats {
  name: string;
  completed_count: number;
  failed_count: number;
  pending_count: number;
  failure_rate: number;        // failed / (completed + failed)
  avg_duration_ms: number | null;
  last_seen_ms: number;
  activity: number[];          // 24 hourly buckets, oldest first
}

interface QueueStats {
  wait_ms: { p50: number | null; p95: number | null };
  run_ms: { p50: number | null; p95: number | null };
  retry_rate: number;
  stalled_count: number;
  failed_count_window: number;
  completed_count_window: number;
  top_errors: { message: string; count: number }[];  // max 10, first line, 200 chars
  est_drain_ms: number | null;  // 0 when no backlog, null when throughput is unknown
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

export const hostedIntro = `
## Hosted management API

The hosted app (superbull.com) additionally exposes a small management surface
under \`/api/...\` on the web app itself. It predates workspaces: every route
below authenticates with a single deployment-wide bearer token
(\`Authorization: Bearer <SUPERBULL_API_TOKEN>\`, timing-safe compared), except
\`/api/health\`, which is public. This surface is transitional: it still speaks
in terms of "sources" (the pre-rewrite name for connectors) on the wire, and
per-workspace API keys are planned to replace the global token. Connector
enrollment and event ingest are not part of it: connectors are created in the
web UI and stream events to the gateway over their WebSocket.
`;

export const hostedHeaders = ['Method', 'Path', 'Query / body', 'Response'];
export const hostedRows = [
  ['GET', '/api/health', '-', '{ ok: true }, no auth'],
  [
    'GET',
    '/api/annotations',
    'source_id, from_ts?, to_ts?',
    '{ annotations: [{ id, source_id, label, ts }] }',
  ],
  [
    'POST',
    '/api/annotations',
    '{ source_id, label, ts | null } (null ts = now)',
    '201, the created annotation',
  ],
];

export const hostedOutro = `
Deploy annotations (\`/api/annotations\`) are the one piece here you may want to
call from CI: post a label like \`deploy 42\` and it renders as a marker on the
analytics charts.
`;
