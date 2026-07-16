# superbull

A restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io), inspired by the
UX of trigger.dev, styled in a clean light theme like dub. It embeds into your existing app
via a thin server adapter (Express, Fastify, Hono, Koa, H3, Hapi, Elysia, Bun, NestJS) and
uses your app's own `bullmq` instance, so job actions are always version-correct.

## Quick start (standalone)

```ts
// Express
import { BullMQAdapter, createBoard } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import { Queue } from 'bullmq';
import express from 'express';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new ExpressAdapter();
createBoard({ queues, serverAdapter });

const app = express();
app.use('/', serverAdapter.getRouter());
app.listen(3000);
```

```ts
// Hono
import { BullMQAdapter, createBoard } from '@superbull/api';
import { HonoAdapter } from '@superbull/hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Queue } from 'bullmq';
import { Hono } from 'hono';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new HonoAdapter(serveStatic);
createBoard({ queues, serverAdapter });

const app = new Hono();
app.route('/', serverAdapter.registerPlugin());
serve({ fetch: app.fetch, port: 3000 });
```

## Two ways to run it

```
 standalone                          hosted
┌─────────────┐              ┌──────────────────────┐
│  your app   │              │  your workers         │
│  + bullmq   │              │  + bullmq              │
│  + adapter  │              │  + @superbull/connector│
│  + UI + API │              │  (outbound WS only)    │
└─────────────┘              └───────────┬────────────┘
   one process                            │ outbound WSS
                                           │ one-time token
                                 ┌─────────▼────────┐
                                 │  connect.superbull│
                                 │  .com  (gateway)  │
                                 └─────────┬─────────┘
                                           │
                              ┌────────────▼────────────┐
                              │  apps/web (Vercel)       │
                              │  workspaces, dashboards, │
                              │  alerts, MCP  (Convex)   │
                              └───────────┬──────────────┘
                                          │
                                 ┌────────▼────────┐
                                 │  browser / agent │
                                 └──────────────────┘
```

- **standalone**: mount an adapter directly in your app. Serves the UI and the REST API in
  the same process. No sign-in, no outbound connection anywhere.
- **hosted**: sign in with Google, create a connector in your workspace, and run
  `npx @superbull/connector` next to your workers. It opens one outbound WebSocket to
  `connect.superbull.com`: no inbound port, no public URL, nothing to expose. Ingest-driven
  history, analytics, error tracking, email alerts, dashboards, and public status pages go
  live for every connector in the workspace; the embedded live dashboard at
  `/app/[workspaceSlug]/connectors/[connectorId]` currently still requires a connector
  registered with a reachable URL via the legacy proxy flow (see the transitional note
  under "The hosted app").

## Connector usage

```bash
npx @superbull/connector --url wss://connect.superbull.com --token <one-time-token>
```

The bin is `superbull-connector`. Create a connector from your workspace (**Connectors →
New connector**) to get that token, plus this exact command with everything filled in. The
token is shown exactly once, and the workspace only ever stores a hash of it.

```
Flag                    Env var           Default
-u, --url               SUPERBULL_URL     (required) gateway URL, wss://connect.superbull.com
-t, --token             SUPERBULL_TOKEN   (required) one-time enrollment token
-n, --name              SUPERBULL_NAME    os.hostname()
--queues a,b,c          SUPERBULL_QUEUES  auto-discovered via SCAN <prefix>:*:meta
--prefix                SUPERBULL_PREFIX  bull
-h, --redis-host        REDIS_HOST        127.0.0.1
-p, --redis-port        REDIS_PORT        6379
--redis-password        REDIS_PASSWORD    -
--redis-db              REDIS_DB          -
--redis-tls             REDIS_TLS=true    false
```

Once connected, the connector streams `job.completed`/`job.failed` events (via BullMQ
`QueueEvents`, not polling) plus a `queue.snapshot` every 60s: counts, worker count, oldest
waiting job age, over that same WebSocket. Delivery is at-least-once: events are only
considered sent once the gateway acknowledges the batch, and the workspace dedupes by event
`uuid`. If the connection drops, the connector reconnects with jittered exponential backoff
(base 1s, cap 60s); an unauthorized token exits instead of retrying. While a connector is
disconnected, live dashboard actions against it fail immediately instead of queuing.

## The hosted app

The hosted app (`apps/web`) is a Next.js app deployed to Vercel. Sign in with Google; a
personal workspace is created for you automatically, and owners/admins can invite teammates
by email (roles: owner/admin/member). Everything it stores, from workspaces and connectors
to ingested events, alert rules, dashboards, and status page configs, lives in **Convex**,
not Postgres.

Architecture:

- **apps/web** (Vercel): marketing, docs, the product under `/app/[workspaceSlug]/...`, and
  public status pages at `/status/[slug]`.
- **apps/gateway** (`connect.superbull.com`): the always-on WebSocket service every
  connector opens its one outbound connection to. It authenticates connectors by token
  hash, forwards their event batches into Convex, and exposes an internal RPC API
  (`POST /internal/rpc`) for relaying dashboard requests to a live connector.
- **Convex**: the datastore, plus the `evaluate alerts` (every 5 minutes) and
  `send daily digest` (daily 09:00 UTC) crons for alert emails. No separate worker process
  to run.

Env vars (names only):

| Var | Used by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | web | The Convex deployment the web app reads/writes against |
| `CONVEX_INTERNAL_TOKEN` | web, gateway, Convex | Shared secret sent with internal Convex calls |
| `SUPERBULL_API_TOKEN` | web | Bearer token guarding the management REST API and the MCP endpoint |
| `CONVEX_URL` | gateway | The Convex deployment the gateway records events into |
| `GATEWAY_INTERNAL_TOKEN` | gateway | Bearer token guarding the gateway's internal RPC API |
| `PORT` | gateway | Listen port (default 4650) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Convex | Alert/digest email delivery (emails are skipped when unset) |

## MCP

The hosted app exposes an MCP server at `POST /api/mcp` (streamable HTTP, SSE disabled).
Auth: `Authorization: Bearer <SUPERBULL_API_TOKEN>`, timing-safe compared and required on
every call; an unset `SUPERBULL_API_TOKEN` rejects all requests.

```bash
claude mcp add --transport http superbull https://superbull.com/api/mcp \
  --header "Authorization: Bearer $SUPERBULL_API_TOKEN"
```

14 tools, all relayed to the connector named by `connector_id`:

| Group | Tools |
| --- | --- |
| Discover | `list_connectors` (never returns enrollment tokens), `remove_connector`; create connectors in the web UI |
| Inspect | `list_queues`, `get_queue`, `get_queue_stats`, `get_job`, `get_job_logs` |
| Act | `add_job`, `retry_job`, `promote_job`, `remove_job`, `pause_queue`, `resume_queue`, `clean_queue` |

An unknown `connector_id` returns a `"connector not found"` tool error; a disconnected
connector fails fast (the gateway rejects the RPC rather than queuing it). See
[/docs/mcp](https://superbull.com/docs/mcp) for per-tool inputs and examples.

## Development

```bash
pnpm install
pnpm build
pnpm test              # requires a local Redis on 6379
pnpm dev

pnpm --filter @superbull/dev seed   # seed apps/dev's demo queues
pnpm --filter @superbull/dev e2e    # standalone adapter e2e (Playwright)
pnpm --filter @superbull/web e2e    # hosted two-hop e2e: convex + gateway + connector fixture (Playwright)
```

## Packages

| Package | Description |
| --- | --- |
| `@superbull/api` | Framework-agnostic core: queue adapter, route table, request handlers |
| `@superbull/react` | The dashboard UI (React + Vite), served as static assets |
| `@superbull/ui` | Shared React component library used by the web app and dashboard |
| `@superbull/protocol` | The connector ↔ gateway WebSocket frame contract (zod schemas) |
| `@superbull/connector` | Outbound-only agent for the hosted app: one WebSocket, no inbound port |
| `@superbull/proxy` | Legacy inbound-HTTP agent, superseded by `@superbull/connector` |
| `@superbull/express` | Express server adapter |
| `@superbull/fastify` | Fastify server adapter |
| `@superbull/hono` | Hono server adapter |
| `@superbull/koa` | Koa server adapter |
| `@superbull/h3` | H3 server adapter |
| `@superbull/hapi` | Hapi server adapter |
| `@superbull/elysia` | Elysia server adapter |
| `@superbull/bun` | Bun server adapter |
| `@superbull/nestjs` | NestJS module |
| `@superbull/test-utils` | Shared test helpers (private) |
| `apps/web` | The hosted app: workspaces, per-connector dashboards, REST + MCP (private) |
| `apps/gateway` | Always-on WebSocket service connectors connect out to (private) |
| `apps/dev` | Local demo/e2e harness for the standalone adapters (private) |

## License

MIT © Mike Wu. Server-adapter architecture derived from
[bull-board](https://github.com/felixmosh/bull-board) (MIT).
