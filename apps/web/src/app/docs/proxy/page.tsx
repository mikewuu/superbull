import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';

export const metadata: Metadata = {
  title: 'Proxy — SuperBull docs',
  description: 'Run superbull-proxy as a headless agent next to your workers.',
};

const intro = `
# Proxy

\`@superbull/proxy\` is a headless SuperBull agent: it wraps your real \`bullmq.Queue\`
instances, exposes the same JSON API a standalone board serves, and ships **no
UI**. It's meant to run next to a worker fleet with no ingress you want to expose,
and to be read by a [hub](/docs/hub) (or your own tooling) over a bearer token.

\`\`\`bash
npm install @superbull/proxy bullmq
\`\`\`

## CLI

\`\`\`bash
npx @superbull/proxy --token <token> [options]
\`\`\`

The bin is \`superbull-proxy\`. A token is the only required argument — everything
else has a default or is auto-discovered.
`;

const flagHeaders = ['Flag', 'Env var', 'Default', 'Notes'];
const flagRows = [
  ['-n, --name <name>', 'SUPERBULL_NAME', 'os.hostname()', 'Shown on the hub'],
  ['-t, --token <token>', 'SUPERBULL_TOKEN', '(required)', 'Bearer token clients must present'],
  ['--port <port>', 'SUPERBULL_PORT', '4650', ''],
  ['-h, --redis-host <host>', 'REDIS_HOST', '127.0.0.1', ''],
  ['-p, --redis-port <port>', 'REDIS_PORT', '6379', ''],
  ['--redis-password <pw>', 'REDIS_PASSWORD', 'undefined', ''],
  ['--redis-db <db>', 'REDIS_DB', 'undefined', ''],
  ['--tls', 'REDIS_TLS=true', 'false', 'TLS for the Redis connection'],
  ['--prefix <prefix>', 'SUPERBULL_PREFIX', 'bull', 'BullMQ key prefix'],
  ['--queues <a,b,c>', 'SUPERBULL_QUEUES', 'undefined', 'Comma-separated queue names'],
  ['--queues-file <path>', '(none)', 'undefined', 'Newline-separated queue names file'],
  ['--hub <url>', 'SUPERBULL_HUB_URL', 'undefined', 'Hub URL to self-register with'],
  ['--hub-token <token>', 'SUPERBULL_HUB_TOKEN', 'undefined', "Hub's HUB_API_TOKEN"],
  ['--advertise-url <url>', '(none)', 'http://<hostname>:<port>', 'URL advertised to the hub'],
  ['--no-ingest', '(none)', 'ingest enabled', 'Disable outbound event ingest to the hub'],
  ['--help', '—', '—', 'Print usage and exit'],
];

const behavior = `
### Queue discovery

If \`--queues\`/\`--queues-file\`/\`SUPERBULL_QUEUES\` aren't set, the proxy scans Redis
for keys matching \`<prefix>:*:meta\` (10s timeout) and uses whatever queue names it
finds. It throws on startup if none are found and none were given explicitly.
Precedence: \`--queues-file\` > \`--queues\` > \`SUPERBULL_QUEUES\` > auto-discovery.

### Auth

Every route except \`GET /healthz\` (unauthenticated, always \`200 {"ok":true}\`)
requires \`Authorization: Bearer <token>\`. The comparison is timing-safe
(\`crypto.timingSafeEqual\`, with a length check first) — wrong or missing token
returns \`401\`.

### Hub registration

If both \`--hub\` and \`--hub-token\` are set, the proxy \`POST\`s to
\`<hub>/api/sources/register\` with \`{ name, url, token }\` (\`token\` is the proxy's
own client-facing bearer token, so the hub can call back into it), retrying up to
3 times with a linear backoff (\`1s, 2s\`). Registration failure is logged and
non-fatal — the proxy keeps serving its API either way.

### Outbound ingest

Once registered (and unless \`--no-ingest\`), the proxy polls each queue's recent
completed/failed jobs every 5s, converts them to \`job.completed\`/\`job.failed\`
events (deduped by a per-queue \`finishedOn\` cursor), and every 60s also emits one
\`queue.snapshot\` event per queue with job counts, worker count, and oldest waiting
job age. Events batch client-side (flush every 5s or at 100 events) and \`POST\` to
\`<hub>/api/ingest\` as \`{ source_id, events }\`, with one retry after a 3s delay
before the batch is dropped.

## Programmatic use

\`startProxy()\` is the same primitive the CLI wraps, for embedding the proxy inside
your own process instead of running the bin:

\`\`\`ts
import { BullMQAdapter } from '@superbull/api';
import { startProxy } from '@superbull/proxy';
import { Queue } from 'bullmq';

const queue = new Queue('email', { connection: { host: '127.0.0.1', port: 6379 } });

const proxy = await startProxy({
  queues: [new BullMQAdapter(queue)],
  token: 'a-strong-token',
  port: 4650,      // default: 0 (OS-assigned)
  host: '0.0.0.0',  // default
});

console.log(\`listening on :\${proxy.port}\`);
// later: await proxy.close();
\`\`\`

\`@superbull/proxy\` also exports the lower-level pieces the CLI composes —
\`discoverQueueNames\`, \`registerWithHub\`, \`createIngestBatcher\`, \`startIngestLoop\`,
and \`parseCliArgs\` — for building a custom entry point.
`;

export default function ProxyPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={flagHeaders} rows={flagRows} />
      <DocsMarkdown content={behavior} />
    </>
  );
}
