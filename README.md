# superbull

A restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io) — inspired by the
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

- **standalone** — mount an adapter directly in your app. Serves the UI and the REST API in
  the same process. No sign-in, no outbound connection anywhere.
- **hosted** — sign in with Google, create a connector in your workspace, and run
  `npx @superbull/connector` next to your workers. It opens one outbound WebSocket to
  `connect.superbull.com`: no inbound port, no public URL, nothing to expose. Its dashboard
  goes live at `/app/[workspaceSlug]/connectors/[connectorId]`, alongside ingest-driven
  analytics, error tracking, email alerts, dashboards, and public status pages for every
  connector in the workspace.

## Connector usage

```bash
npx @superbull/connector --token <the-one-time-token-from-your-workspace>
```

The bin is `superbull-connector`. Create a connector from your workspace (**Connectors → New
connector**) to get that token — it's shown exactly once, and the workspace only ever stores
a hash of it.

```
Flag                  Env var           Default
-t, --token            SUPERBULL_TOKEN   (required)
--url                  SUPERBULL_URL     wss://connect.superbull.com
-n, --name             SUPERBULL_NAME    os.hostname()
--queues a,b,c         SUPERBULL_QUEUES  auto-discovered via SCAN
--prefix               SUPERBULL_PREFIX  bull
-h, --redis-host       REDIS_HOST        127.0.0.1
-p, --redis-port       REDIS_PORT        6379
--redis-password       REDIS_PASSWORD    -
--redis-db             REDIS_DB          -
--redis-tls            REDIS_TLS=true    false
```

Once connected, the connector streams `job.completed`/`job.failed` events (via BullMQ
`QueueEvents`, not polling) plus a `queue.snapshot` every 60s — counts, worker count, oldest
waiting job age — over that same WebSocket. Delivery is at-least-once: events are only
considered sent once the gateway acknowledges the batch, and the workspace dedupes by event
`uuid`. If the connection drops, the connector reconnects with jittered exponential backoff
(base 1s, cap 60s); while disconnected, dashboard and MCP actions against it fail fast with
`"connector disconnected"` instead of queuing.

## The hosted app

The hosted app (`apps/web`) is a Next.js app deployed to Vercel. Sign in with Google; a
personal workspace is created for you automatically, and you can invite teammates by email
(roles: owner/admin/member). Everything it stores — workspaces, members, connectors, ingested
events, alert rules, dashboards, status page configs — lives in **Convex**, not Postgres.

Architecture:

- **apps/web** (Vercel) — marketing, docs, the product under `/app/[workspaceSlug]/...`, and
  public status pages at `/status/[slug]`.
- **apps/gateway** (`connect.superbull.com`) — the always-on WebSocket service every connector
  opens its one outbound connection to; relays requests from the web app to the right
  connector and forwards its events back.
- **Convex** — the datastore, plus `evaluateAlerts` (every 5 minutes) and `sendDigest` (daily
  9am) crons for alert emails, no separate worker process to run.

Env vars:

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment the web app reads/writes against |
| `CONVEX_INTERNAL_TOKEN` | Shared secret the web app and gateway send with internal Convex calls |
| `SUPERBULL_API_TOKEN` | Bearer token that guards the management REST API and the MCP endpoint |
| `GATEWAY_URL` / `GATEWAY_INTERNAL_TOKEN` | Where the web app reaches the gateway's internal RPC API, and its bearer token |

## MCP

Endpoint: `POST /api/mcp` (streamable HTTP, `mcp-handler` + `@modelcontextprotocol/sdk`).
Auth: `Authorization: Bearer <SUPERBULL_API_TOKEN>` — timing-safe compared, required on every call;
an unset `SUPERBULL_API_TOKEN` rejects all requests.

| Tool | Effect |
| --- | --- |
| `list_connectors` | List connectors in the workspace (no tokens) |
| `remove_connector` | Delete a connector |
| `list_queues` | Queue name/counts/paused state for a connector |
| `get_queue` | One queue's current page of jobs (`status`, `page` filters) |
| `retry_job` | Retry a failed/completed job |
| `pause_queue` / `resume_queue` | Stop/start a queue's processing |

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
| `@superbull/connector` | Outbound-only agent for the hosted app — one WebSocket, no inbound port |
| `@superbull/express` | Express server adapter |
| `@superbull/fastify` | Fastify server adapter |
| `@superbull/hono` | Hono server adapter |
| `@superbull/koa` | Koa server adapter |
| `@superbull/h3` | H3 server adapter |
| `@superbull/hapi` | Hapi server adapter |
| `@superbull/elysia` | Elysia server adapter |
| `@superbull/bun` | Bun server adapter |
| `@superbull/nestjs` | NestJS module |
| `apps/web` | The hosted app: workspaces, per-connector dashboards, REST + MCP |
| `apps/gateway` | Always-on WebSocket service connectors connect out to |

## License

MIT © Mike Wu. Server-adapter architecture derived from
[bull-board](https://github.com/felixmosh/bull-board) (MIT).
