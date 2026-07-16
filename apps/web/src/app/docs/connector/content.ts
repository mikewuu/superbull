export const intro = `
# Connector

\`@superbull/connector\` is a headless SuperBull agent: it watches your real
\`bullmq\` queues over your own Redis connection and streams what it sees to your
workspace. It opens **one outbound WebSocket** to the SuperBull gateway and
nothing else: no inbound port, no public URL, nothing to put behind a load
balancer or open a firewall rule for.

\`\`\`bash
npx @superbull/connector --url wss://connect.superbull.com --token <enrollment-token>
\`\`\`

The bin is \`superbull-connector\`. Two arguments are required: the gateway URL
(\`--url\`) and the enrollment token (\`--token\`). Everything else has a default
or is auto-discovered. The **New connector** dialog in your workspace prints
this exact command with both filled in.

## Getting a token

Create a connector from your workspace (**Connectors → New connector**). You
get a one-time enrollment token, shown exactly once. The workspace only ever stores
a hash of it, so if you lose it before pasting it into \`--token\`, delete the
connector and create a new one.
`;

export const flagHeaders = ['Flag', 'Env var', 'Default', 'Notes'];
export const flagRows = [
  [
    '-u, --url <url>',
    'SUPERBULL_URL',
    '(required)',
    'Gateway WebSocket URL, wss://connect.superbull.com for the hosted app',
  ],
  ['-t, --token <token>', 'SUPERBULL_TOKEN', '(required)', 'One-time enrollment token'],
  ['-n, --name <name>', 'SUPERBULL_NAME', 'os.hostname()', 'Shown in the dashboard'],
  [
    '--queues <a,b,c>',
    'SUPERBULL_QUEUES',
    'auto-discovered',
    'Comma-separated queue names; skips discovery',
  ],
  ['--prefix <prefix>', 'SUPERBULL_PREFIX', 'bull', 'BullMQ key prefix'],
  ['-h, --redis-host <host>', 'REDIS_HOST', '127.0.0.1', ''],
  ['-p, --redis-port <port>', 'REDIS_PORT', '6379', ''],
  ['--redis-password <pw>', 'REDIS_PASSWORD', '(none)', ''],
  ['--redis-db <db>', 'REDIS_DB', '(none)', ''],
  ['--redis-tls', 'REDIS_TLS=true', 'false', 'TLS for the Redis connection'],
  ['--help', '-', '-', 'Print usage and exit'],
];

export const behavior = `
Unknown flags are an error (strict parsing), and a flag always wins over its
env var.

### Queue discovery

If \`--queues\`/\`SUPERBULL_QUEUES\` isn't set, the connector scans Redis for keys
matching \`<prefix>:*:meta\` (a bounded SCAN with a 10s budget) and watches
whatever queue names it finds. If discovery finds nothing and no queues were
given explicitly, it exits with an error asking for \`--queues\`.

### Connector vs. connection

A **connector** is the installed process: one \`npx @superbull/connector\`
running next to a worker fleet, tied to one row in your workspace. A
**connection** is that process's current live WebSocket session; a connector
can exist with no open connection (stopped, crashed, between deploys). The
dashboard reflects both: the connector always exists once created, the
connection comes and goes.

### Security

The connector never listens on a port. It authenticates by sending its token
in a \`hello\` frame over the outbound WebSocket it opened; the gateway hashes
the presented token (sha256) and looks it up, so the plaintext is never stored
anywhere. If the token doesn't match, the connector logs the unauthorized
error and **exits without reconnecting**, so a revoked or mistyped token can't
turn into a reconnect loop. If a second process connects with the same token,
the gateway closes the older session and keeps the new one. There's nothing to
expose to the internet and no bearer token to guard on your end, because your
end never accepts inbound connections.

### Live events

Job completions and failures aren't polled. The connector opens one BullMQ
\`QueueEvents\` blocking connection per watched queue and forwards
\`job.completed\`/\`job.failed\` as they happen, each carrying \`ts\` and
(best-effort, looked up from the job) \`job_name\`, \`duration_ms\`, \`wait_ms\`,
and for failures a \`failed_reason\` truncated to 500 characters. Every 60
seconds it also emits a \`queue.snapshot\` per queue: job counts, worker count,
and the oldest waiting job's age. Snapshots are what stuck-queue and
worker-loss alerts are built on, so they keep flowing even during a quiet
stretch with no completions or failures. (Analytics and the heatmap are
computed from the completion and failure events, not from snapshots.)

### Delivery: at least once

Events batch client-side (batches of 100, flushed at least every 5 seconds,
up to 500 per frame) and are only considered sent once the gateway replies
with \`events_ack\`; the connector's per-queue \`QueueEvents\` cursor only
advances on ack. A dropped ack means the same events ship again on reconnect,
and the workspace dedupes incoming events by their \`uuid\`, so retries are
safe. If more than 5000 events pile up while disconnected, the oldest are
dropped with a warning rather than growing memory without bound.

### Reconnecting

The gateway pings over the WebSocket every 15 seconds. If a connector hears
nothing for 45 seconds, it assumes the connection is dead and reconnects with
jittered exponential backoff: each delay is a random value up to the current
cap, which doubles from 1s to a 60s maximum. While a connector is offline,
live dashboard actions against it fail immediately instead of queuing, since
a mutation like retry can't be safely replayed later; its already-ingested
history, analytics, and status pages keep working.
`;
