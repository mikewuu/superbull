# SuperBull hosted-SaaS rewrite — plan & contracts

> Historical plan. The shipped app uses projects, `/app/[projectSlug]`, per-user `sbh_`
> API keys, and project-bound `sbho_` OAuth access tokens. See `README.md` for current behavior.

Owner-approved 2026-07-16. Branch: `rewrite/hosted-saas`. Fresh rewrite: no
production data, no published compatibility contract. This document is the
single source of truth for cross-territory contracts. If you need to deviate,
note it in your report — do not silently change a contract.

## Target architecture

```
Browser / MCP
     │ REST (unchanged shapes)
     ▼
apps/web  (Vercel: marketing /, docs /docs, product /app, public /status/[slug])
     │ internal HTTP (Bearer GATEWAY_INTERNAL_TOKEN)
     ▼
apps/gateway  (always-on Node WS service, connect.superbull.com)
     ▲ one outbound WSS per connector (typed frames, @superbull/protocol)
     │
packages/connector  (@superbull/connector, bin superbull-connector)
     │
     ├─ 1 shared IORedis command connection (reads + mutations)
     ├─ 1 BullMQ QueueEvents blocking connection per monitored queue
     └─ 60s queue.snapshot emitter (counts, workerCount, oldestWaiting)
```

Convex remains the datastore. The gateway talks to Convex directly with
`ConvexHttpClient` + `makeFunctionReference` string refs + `CONVEX_INTERNAL_TOKEN`
(no dependency on web's generated `api` object).

## Locked decisions

- Multi-tenant: workspaces + members (+ invites). Users belong to many
  workspaces. Ownership checks in every Convex query/mutation.
- Auth: port `/Users/mike/Code/superboard` — `@convex-dev/auth` with the
  `Google` provider + `AUTH_TEST_LOGIN`-gated test provider. (Owner said
  "NextAuth"; superboard IS the house convention on Convex — flagged.)
  Google creds live on the Convex deployment as `AUTH_GOOGLE_ID` /
  `AUTH_GOOGLE_SECRET`.
- Tenant routing: slug-based, superboard-style —
  `/app` (workspace picker/redirect), `/app/[workspaceSlug]/...` product,
  `/app/[workspaceSlug]/connectors/[connectorId]` embedded SPA.
- Connector enrollment: hub mutation creates a connector row storing only a
  sha256 hash of a one-time token; the plaintext is shown once in the UI.
- Live mutations are never replayed after disconnect; RPC fails fast with
  "connector disconnected".
- Ingest: at-least-once. Connector advances per-queue QueueEvents cursor only
  after `events_ack`. Hub dedupes by event `uuid`.
- `queue.snapshot` events (60s) MUST survive the QueueEvents switch —
  stuck_queue/worker_loss alerts and analytics depend on them.
- Crons: `evaluateAlerts` (*/5) and `sendDigest` (daily 9:00) move to Convex
  crons + a `"use node"` action that renders React Email and calls Resend.
  Delete the `@nextastic/queue` worker and its Redis requirement.
- Preserve standalone adapter mode untouched: `createBoard` + `appRoutes` +
  `IServerAdapter` + all 9 framework adapters + `@superbull/react` serving.
- Renames: proxySources→connectors, sourceId→connectorId,
  ProxySource→Connector, list_sources→list_connectors,
  SUPERBULL_HUB_URL→SUPERBULL_URL, superbull-proxy→superbull-connector.
  "Connector" = installed process; "connection" = live socket session.

## Contracts

### WS frame protocol
Defined in `packages/protocol/src/index.ts` (`@superbull/protocol`). Do not
redefine frames locally — import them. Highlights: `hello`/`hello_ack`/
`hello_error(unauthorized ⇒ no reconnect)`, `request`/`response` (RPC mirroring
the existing REST internals: method + path[] + search + body + content_type),
`events`/`events_ack` (batch_id; ≤500 events), gateway-initiated WS ping every
15s, connector reconnects after 45s silence with jittered exponential backoff
(base 1s, cap 60s).

### Gateway internal HTTP API (web → gateway)
All under Bearer `GATEWAY_INTERNAL_TOKEN`; schemas in `@superbull/protocol`:
- `POST /internal/rpc` — RpcRequest → RpcResponse. 502
  `{"error":"connector disconnected"}` if no live socket; 504 on RPC_TIMEOUT_MS.
- `GET /internal/connectors/:connectorId/status` — ConnectorStatus.
- `GET /healthz` — `{ok:true}`, unauthenticated.

### Gateway → Convex functions (string refs; implemented in Round 2)
All take `internalToken` and check it against `CONVEX_INTERNAL_TOKEN`:
- query `connectors:findByEnrollmentTokenHash({internalToken, tokenHash})` →
  `{ connectorId, workspaceId, name } | null`
- mutation `connectors:markConnected({internalToken, connectorId, version, queues})`
- mutation `connectors:markDisconnected({internalToken, connectorId})`
- mutation `ingest:recordBatch({internalToken, connectorId, events})` →
  `{ accepted, deduped }` (events = protocol IngestEvent[], snake_case in,
  camelCase stored; dedupe by uuid)

### Connector CLI
```
npx @superbull/connector \
  --url wss://connect.superbull.com \
  --token <enrollment-token> \
  --redis-host ... [--redis-port ...] [--redis-password ...] [--redis-db ...] [--redis-tls] \
  [--queues a,b] [--prefix bull] [--name my-app]
```
Env fallbacks: `SUPERBULL_URL`, `SUPERBULL_TOKEN`, `SUPERBULL_NAME`,
`SUPERBULL_QUEUES`, `SUPERBULL_PREFIX`, `REDIS_HOST/PORT/PASSWORD/DB/TLS`.
Removed: `--port`, `--hub-token`, `--advertise-url`, `/healthz`, inbound HTTP.
QueueEvents event mapping: uuid = `${queueName}:${streamEventId}`;
`job.completed`/`job.failed` carry ts, duration_ms, wait_ms, failed_reason.

### Convex schema (Round 2)
- `workspaces`: name, slug, createdAt — by_slug
- `members`: workspaceId, userId, role('owner'|'admin'|'member') — by_user,
  by_workspace, by_workspace_user
- `invites`: workspaceId, email, role, tokenHash, invitedBy, expiresAt,
  acceptedAt? — by_workspace, by_token_hash, by_email
- `connectors` (replaces proxySources): workspaceId, name, tokenHash,
  version?, queues?, lastConnectedAt?, lastDisconnectedAt? — by_workspace,
  by_token_hash, by_workspace_name
- Every domain table (ingestEvents, errorGroups, deployAnnotations,
  alertRules, alertStates, savedDashboards, statusPageConfigs) gains
  workspaceId; sourceId fields become connectorId; indexes updated to match.
- `convex/access.ts` guards ported from superboard: requireUser,
  requireWorkspaceMember (404-not-403), requireRole. First line of every
  user-facing query/mutation. internalToken gate stays for gateway-called fns.
- Bootstrap: afterUserCreatedOrUpdated → create personal workspace + owner
  member (find-or-create idempotency, cf. uprank getOrBootstrapWorkspace).

### Env vars
- web: NEXT_PUBLIC_CONVEX_URL, CONVEX_INTERNAL_TOKEN, SUPERBULL_API_TOKEN
  (MCP), GATEWAY_URL, GATEWAY_INTERNAL_TOKEN, RESEND_* → moves to Convex.
- gateway: PORT (default 4650), CONVEX_URL, CONVEX_INTERNAL_TOKEN,
  GATEWAY_INTERNAL_TOKEN.
- Convex deployment: AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_TEST_LOGIN,
  CONVEX_INTERNAL_TOKEN, RESEND_API_KEY, EMAIL_FROM.

## Naming trap
`apps/hub/src/proxy.ts` is the Next.js AUTH MIDDLEWARE (Next 16 renamed
middleware.ts → proxy.ts). It is unrelated to `packages/proxy`. When merging,
it becomes `apps/web/src/proxy.ts`.

## Rounds

1. (parallel) A: merge apps/hub → apps/web mechanically (behavior-preserving).
   B: apps/gateway. C: packages/connector.
2. (parallel) D: multi-tenant Convex schema + auth + guards + workspace UI.
   E: Convex crons + email actions, delete worker. F: docs/marketing renames.
3. Integration: forwardToProxy → gateway RPC, enrollment UI, SPA route move,
   delete packages/proxy + register/ingest HTTP routes, MCP renames, e2e
   rewrite for the new two-hop (web ↔ gateway ↔ connector).
4. Gates: lint, typecheck, build, unit, contract, Playwright e2e. Fix-first;
   gates run once at round end.
