# bullwatch

A restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io) — inspired by the
UX of trigger.dev, styled in a clean light theme like dub. It embeds into your existing app
via a thin server adapter (Express, Fastify, Hono, Koa, H3, Hapi, Elysia, Bun, NestJS) and
uses your app's own `bullmq` instance, so job actions are always version-correct.

## Quick start (standalone)

```ts
// Express
import { BullMQAdapter, createBoard } from '@bullwatch/api';
import { ExpressAdapter } from '@bullwatch/express';
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
import { BullMQAdapter, createBoard } from '@bullwatch/api';
import { HonoAdapter } from '@bullwatch/hono';
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

## Three modes

```
 standalone                    proxy                      hub
┌─────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  your app   │        │  your workers   │        │  bullwatch hub  │
│  + bullmq   │        │  + bullmq       │        │  (Next.js app)  │
│  + adapter  │        │  + @bw/proxy    │◄───────│  federates N    │
│  + UI + API │        │  (headless API) │  poll   │  proxy sources  │
└─────────────┘        └─────────────────┘        └────────┬────────┘
   one process             no UI, bearer                    │ SPA + REST
                           token auth, /healthz              │ + MCP
                                                       ┌──────┴──────┐
                                                       │   browser / │
                                                       │   AI agent  │
                                                       └─────────────┘
```

- **standalone** — mount an adapter directly in your app. Serves the UI and the REST API in
  the same process.
- **proxy** (`@bullwatch/proxy`) — a headless agent you run next to your workers. Same REST
  API, no UI, bearer-token auth, an open `/healthz`. Meant to sit behind a hub.
- **hub** (`apps/hub`) — a Next.js app that federates one or more proxies: it stores sources
  in Convex, serves the `@bullwatch/react` SPA per source at `/s/[sourceId]/`, forwards API
  calls to the matching proxy, and exposes a management REST API and an MCP endpoint.

## Proxy usage

```ts
import { BullMQAdapter } from '@bullwatch/api';
import { startProxy } from '@bullwatch/proxy';
import { Queue } from 'bullmq';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

await startProxy({ queues, token: process.env.PROXY_TOKEN!, port: 4650 });
```

Point the hub at it: `POST /api/sources` with `{ "name": "...", "url": "http://host:4650",
"token": "..." }` (or use the "Add source" form, or the `add_source` MCP tool).

### `bullwatch-proxy` CLI

`@bullwatch/proxy` also ships a `bullwatch-proxy` bin — no code required next to your workers:

```bash
npx bullwatch-proxy --token $BULLWATCH_TOKEN --queues my-queue,other-queue \
  --hub https://hub.example.com --hub-token $HUB_API_TOKEN
```

It connects to Redis (`--redis-host`/`--redis-port`/`--redis-password`/`--redis-db`/`--tls`,
or the matching `REDIS_*` env vars), resolves which queues to serve — an explicit
`--queues a,b,c` / `--queues-file path` list (entries may be `customprefix:name`), or an
automatic `SCAN` for `${prefix}:*:meta` keys when neither is given — starts the proxy, and,
if `--hub`/`--hub-token` are set, self-registers with the hub (`POST /api/sources/register`,
upserted by name) and starts shipping completed/failed job events plus periodic queue
snapshots to it (`--no-ingest` to register without shipping events). Run
`bullwatch-proxy --help` for the full flag list.

## Hub setup

```bash
cd apps/hub
npx convex dev   # deploys convex/, writes NEXT_PUBLIC_CONVEX_URL to .env.local
```

`npx convex dev` with no Convex account configures a local anonymous deployment automatically
(`CONVEX_AGENT_MODE=anonymous npx convex dev` forces that path without a login prompt). For a
real deployment, run `npx convex deploy` against a Convex project and copy its URL instead.

| Env var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment the hub reads/writes sources against |
| `CONVEX_INTERNAL_TOKEN` | Shared secret the hub sends with every Convex call; the deployment checks it against its own env var of the same name (`npx convex env set CONVEX_INTERNAL_TOKEN ...`) |
| `HUB_API_TOKEN` | Bearer token that guards the management REST API and the MCP endpoint |

Deploys to Vercel as a normal Next.js app. `next.config.ts` already sets
`outputFileTracingIncludes` so `@bullwatch/react`'s built SPA assets ship with the
`/s/[sourceId]/[[...rest]]` route in the standalone output.

**Add-source flow**: visit `/`, fill in a name, the proxy's URL, and its `startProxy` token.
The row shows live health (`GET /healthz`) and queue count (`GET /api/queues`), and links to
that source's dashboard at `/s/[sourceId]/`. A `bullwatch-proxy` started with `--hub`/
`--hub-token` registers itself the same way — no form needed — via
`POST /api/sources/register` (bearer `HUB_API_TOKEN`, body `{ name, url, token }`, upserted
by `name` so re-running the same proxy updates its existing source instead of duplicating it).

**Ingest**: proxies with a hub configured batch completed/failed job events and periodic
queue snapshots (every 5s or 100 events, single 3s-delayed retry on failure) to
`POST /api/ingest`. That endpoint is authenticated per-source — the bearer token must match
the *source's own* `startProxy` token, not `HUB_API_TOKEN` — and stores events in Convex
(`ingestEvents`, deduped by event `uuid`).

## MCP

Endpoint: `POST /api/mcp` (streamable HTTP, `mcp-handler` + `@modelcontextprotocol/sdk`).
Auth: `Authorization: Bearer <HUB_API_TOKEN>` — timing-safe compared, required on every call;
an unset `HUB_API_TOKEN` rejects all requests.

| Tool | Effect |
| --- | --- |
| `list_sources` | List proxy sources (no tokens) |
| `add_source` | Register a proxy (`{ name, url, token }`); stores the token, never returns it |
| `remove_source` | Delete a proxy source |
| `list_queues` | Queue name/counts/paused state for a source |
| `get_queue` | One queue's current page of jobs (`status`, `page` filters) |
| `retry_job` | Retry a failed/completed job |
| `pause_queue` / `resume_queue` | Stop/start a queue's processing |

## Development

```bash
pnpm install
pnpm build
pnpm test              # requires a local Redis on 6379
pnpm dev

pnpm --filter @bullwatch/dev seed   # seed apps/dev's demo queues
pnpm --filter @bullwatch/dev e2e    # standalone adapter e2e (Playwright)
pnpm --filter @bullwatch/hub e2e    # hub two-hop e2e: convex + proxy fixture + hub (Playwright)
```

## Packages

| Package | Description |
| --- | --- |
| `@bullwatch/api` | Framework-agnostic core: queue adapter, route table, request handlers |
| `@bullwatch/react` | The dashboard UI (React + Vite), served as static assets |
| `@bullwatch/proxy` | Headless agent for the proxy mode — REST API only, no UI |
| `@bullwatch/express` | Express server adapter |
| `@bullwatch/fastify` | Fastify server adapter |
| `@bullwatch/hono` | Hono server adapter |
| `@bullwatch/koa` | Koa server adapter |
| `@bullwatch/h3` | H3 server adapter |
| `@bullwatch/hapi` | Hapi server adapter |
| `@bullwatch/elysia` | Elysia server adapter |
| `@bullwatch/bun` | Bun server adapter |
| `@bullwatch/nestjs` | NestJS module |
| `apps/hub` | The hub: federates proxy sources, per-source dashboards, REST + MCP |

## License

MIT © Mike Wu. Server-adapter architecture derived from
[bull-board](https://github.com/felixmosh/bull-board) (MIT).
