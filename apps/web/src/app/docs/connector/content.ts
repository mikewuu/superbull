export const intro = `
# Connector

\`@superbull/connector\` is a headless SuperBull agent: it watches your real
\`bullmq\` queues over your own Redis connection and streams what it sees to your
workspace. It opens **one outbound WebSocket** to the SuperBull gateway and
nothing else: no inbound port, no public URL, nothing to put behind a load
balancer or open a firewall rule for.

\`\`\`bash
npx @superbull/connector --token <enrollment-token>
\`\`\`

The bin is \`superbull-connector\`. A token is the only required argument.
Everything else, including which gateway to connect to, has a default or is
auto-discovered.

## Getting a token

Create a connector from your workspace (**Connectors → New connector**). You
get a one-time enrollment token, shown exactly once. The workspace only ever stores
a hash of it, so if you lose it before pasting it into \`--token\`, delete the
connector and create a new one.
`;

export const flagHeaders = ['Flag', 'Env var', 'Default', 'Notes'];
export const flagRows = [
  ['-t, --token <token>', 'SUPERBULL_TOKEN', '(required)', 'One-time enrollment token'],
  ['--url <url>', 'SUPERBULL_URL', 'wss://connect.superbull.com', 'Gateway WebSocket URL'],
  ['-n, --name <name>', 'SUPERBULL_NAME', 'os.hostname()', 'Shown in the dashboard'],
  ['--queues <a,b,c>', 'SUPERBULL_QUEUES', 'undefined', 'Comma-separated queue names'],
  ['--prefix <prefix>', 'SUPERBULL_PREFIX', 'bull', 'BullMQ key prefix'],
  ['-h, --redis-host <host>', 'REDIS_HOST', '127.0.0.1', ''],
  ['-p, --redis-port <port>', 'REDIS_PORT', '6379', ''],
  ['--redis-password <pw>', 'REDIS_PASSWORD', 'undefined', ''],
  ['--redis-db <db>', 'REDIS_DB', 'undefined', ''],
  ['--redis-tls', 'REDIS_TLS=true', 'false', 'TLS for the Redis connection'],
  ['--help', '-', '-', 'Print usage and exit'],
];

export const behavior = `
### Queue discovery

If \`--queues\`/\`SUPERBULL_QUEUES\` isn't set, the connector scans Redis for keys
matching \`<prefix>:*:meta\` and watches whatever queue names it finds. It
throws on startup if none are found and none were given explicitly.

### Connecting vs. connected

A **connector** is the installed process: one \`npx @superbull/connector\`
running next to a worker fleet, tied to one row in your workspace. A
**connection** is that process's current live WebSocket session; a connector
can exist with no open connection (stopped, crashed, between deploys). The
dashboard and \`list_connectors\` reflect both: the connector always exists
once created, the connection comes and goes.

### Security

The connector never listens on a port. It authenticates by sending its token
in a \`hello\` frame over the outbound WebSocket it opened; the gateway looks up
the token by its hash and rejects (no reconnect) if it doesn't match, is
already used to establish a different live session, or was revoked. There's
nothing to expose to the internet and no bearer token to guard on your end,
because your end never accepts inbound connections.

### Live events

Job completions and failures aren't polled. The connector opens one BullMQ
\`QueueEvents\` blocking connection per watched queue and forwards
\`job.completed\`/\`job.failed\` as they happen, each carrying \`ts\`,
\`duration_ms\`, \`wait_ms\`, and (for failures) \`failed_reason\`. Every 60 seconds
it also emits a \`queue.snapshot\` per queue: job counts, worker count, and the
oldest waiting job's age. Snapshots are what stuck-queue and worker-loss
alerts and the analytics/heatmap views are built on, so they keep flowing even
during a quiet stretch with no completions or failures.

### Delivery: at least once

Events batch client-side (up to 500 per batch) and are only considered sent
once the gateway replies with \`events_ack\`; the connector's per-queue
\`QueueEvents\` cursor only advances on ack. A dropped ack means the same events
ship again on reconnect. The workspace dedupes incoming events by their
\`uuid\`, so retries are safe.

### Reconnecting

The gateway pings every 15 seconds. If a connector hears nothing for 45
seconds, it assumes the connection is dead and reconnects with jittered
exponential backoff (starting at 1s, capped at 60s). While disconnected,
actions from the dashboard or MCP fail immediately with "connector
disconnected" rather than queuing, since a live mutation can't be replayed
after the fact.
`;
