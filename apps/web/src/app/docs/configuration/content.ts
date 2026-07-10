export const intro = `
# Configuration

Every knob for how a queue behaves in the dashboard is a \`Partial<QueueAdapterOptions>\`
passed as the second argument to \`new BullMQAdapter(queue, options)\`.

\`\`\`ts
import { BullMQAdapter } from '@superbull/api';

new BullMQAdapter(queue, {
  readOnlyMode: false,
  allowRetries: true,
  allowCompletedRetries: true,
  prefix: '',
  description: '',
  displayName: '',
  format: (field, value) => value,
});
\`\`\`

## Options
`;

export const headers = ['Option', 'Type', 'Default', 'Effect'];
export const rows = [
  [
    'readOnlyMode',
    'boolean',
    'false',
    'Every mutating route (pause/resume/clean/retry/promote/add/bulk/concurrency) 405s. Forces allowRetries to false regardless of its own setting.',
  ],
  [
    'allowRetries',
    'boolean',
    'true (false if readOnlyMode)',
    'Gates job and bulk retry routes with 405 when off.',
  ],
  [
    'allowCompletedRetries',
    'boolean',
    'true',
    'Only takes effect if allowRetries is also true (AND-ed). Lets completed jobs be retried, not just failed ones.',
  ],
  [
    'prefix',
    'string',
    "''",
    "Prepended to the queue's display name in getName() — ${prefix}${queue.name}. Useful when the same queue name repeats across environments in one board.",
  ],
  [
    'description',
    'string',
    "''",
    'Shown on the queue overview card; surfaced in AppQueue.description.',
  ],
  [
    'displayName',
    'string',
    "''",
    'Overrides the queue name shown in the UI; surfaced in AppQueue.display_name.',
  ],
  ['format', '(field, value) => unknown', 'undefined', 'Redaction hook, see below.'],
];

export const redaction = `
## Redaction

\`format\` runs on a job's \`data\` and \`return_value\` before they're serialized into
\`AppJob\` — the only two fields where arbitrary user payloads reach the wire:

\`\`\`ts
type RedactFormatter = (field: 'data' | 'return_value', value: unknown) => unknown;

new BullMQAdapter(queue, {
  format: (field, value) => {
    if (field === 'data' && typeof value === 'object' && value !== null) {
      const { password, ...safe } = value as Record<string, unknown>;
      return safe;
    }
    return value;
  },
});
\`\`\`

The redacted value replaces the field entirely in the API response — nothing the
hook drops is sent to the browser. Apply this per-queue if only some queues carry
sensitive payloads.

## Multi-Redis

There's no dedicated "multi-Redis" option — it falls out of how queues are wrapped.
Each \`bullmq.Queue\` carries its own \`connection\`, and \`createBoard()\` (or
\`startProxy()\`) just takes an array of \`BaseAdapter\`s:

\`\`\`ts
const usQueue = new Queue('orders', { connection: { host: 'redis-us.internal' } });
const euQueue = new Queue('orders', { connection: { host: 'redis-eu.internal' } });

createBoard({
  queues: [
    new BullMQAdapter(usQueue, { prefix: 'us:' }),
    new BullMQAdapter(euQueue, { prefix: 'eu:' }),
  ],
  serverAdapter,
});
\`\`\`

Give same-named queues on different Redis instances distinct \`prefix\`es so they
don't collide in the UI — \`getName()\` is \`\${prefix}\${queue.name}\`.

## Prometheus

\`GET /api/prometheus\` (see [REST API](/docs/api)) returns \`text/plain\`, one
Prometheus exposition block per mounted queue, from BullMQ's own
\`queue.exportPrometheusMetrics()\` — no separate scrape config beyond pointing
Prometheus at that path.
`;
