export const intro = `
# Hub

\`apps/hub\` is a Next.js 16 app (port 4600, Vercel-deployable) that federates
multiple **sources** — proxies or standalone boards — into one place. Everything
the hub stores (sources, ingested events, error groups, alert rules, dashboards,
status page configs, users) lives in **Convex**, not Postgres — the hub has no
database of its own beyond that.

## Deploy

\`\`\`bash
cd apps/hub
npx convex dev   # creates/links a Convex deployment, writes NEXT_PUBLIC_CONVEX_URL
npx @convex-dev/auth   # generates and sets JWT_PRIVATE_KEY / JWKS on the deployment
\`\`\`

Then set the app's own env (see [Configuration](/docs/configuration) for the full
list): \`NEXT_PUBLIC_CONVEX_URL\`, \`CONVEX_INTERNAL_TOKEN\`, \`SUPERBULL_API_TOKEN\`. Deploy
the Next app anywhere that runs Next 16 (\`npm run dev\` binds port 4600 locally).
There's no platform cron config — the alert/digest jobs need
\`apps/hub/src/scripts/start-queue-worker.ts\` running as its own long-lived
process alongside the Next app (see "Background jobs" below).

## Auth — first-user gate

The hub is single-tenant. Sign-up (\`@convex-dev/auth\`, credentials provider,
password hashed with \`Scrypt\`) is only accepted while no user exists yet — the
first person to sign up becomes the only account. After that, sign-up requests are
rejected with "Ask an existing user to invite you." — there's no in-app invite flow.

## Registering a source

A source is a proxy (or standalone board) the hub can reach and forward requests
to. Register one with the management REST API or the \`add_source\` MCP tool (see
[MCP](/docs/mcp)):

\`\`\`bash
curl -X POST https://your-hub.example.com/api/sources \\
  -H "Authorization: Bearer $SUPERBULL_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"payments-prod","url":"https://proxy.internal:4650","token":"<proxy bearer token>"}'
\`\`\`

A proxy started with \`--hub-url\`/\`--hub-token\` (see [Proxy](/docs/proxy))
self-registers this way on startup instead — \`POST /api/sources/register\` upserts
by \`name\` so restarts don't create duplicates.

## Management REST API

Every route below is authenticated with \`Authorization: Bearer $SUPERBULL_API_TOKEN\`
(timing-safe compare), except \`/api/health\` and \`/api/ingest\` (see below).
`;

export const headers = ['Method', 'Path', 'Body / query', 'Response'];
export const rows = [
  ['GET', '/api/sources', '—', '{ sources: [{ id, name, url, created_at }] }'],
  ['POST', '/api/sources', '{ name, url, token }', '201 { id, name, url, created_at }'],
  [
    'POST',
    '/api/sources/register',
    '{ name, url, token }',
    '200 { source_id, name, url } — upserts by name',
  ],
  ['DELETE', '/api/sources/:sourceId', '—', '204; 404 if unknown'],
  [
    'GET',
    '/api/annotations',
    'source_id, from_ts?, to_ts?',
    '{ annotations: [{ id, source_id, label, ts }] }',
  ],
  [
    'POST',
    '/api/annotations',
    '{ source_id, label, ts: number | null }',
    '201 { id, source_id, label, ts } — null ts becomes now',
  ],
  ['GET', '/api/health', '—', '{ ok: true } — unauthenticated'],
];

export const ingestSection = `
## Ingest

\`POST /api/ingest\` is authenticated differently — with the **source's own token**
(the one you registered it with), not \`SUPERBULL_API_TOKEN\`:

\`\`\`
POST /api/ingest
{ "source_id": "...", "events": [ { "uuid", "type", "queue_name", "ts", ... } ] }
\`\`\`

Up to 500 events per batch. Each event: \`uuid, type, queue_name, ts\` required,
plus \`job_name?, job_id?, duration_ms?, wait_ms?, failed_reason?, counts?,
worker_count?, oldest_waiting_ms?\`. Events are deduped on \`uuid\` before any
accounting. Responds \`{ accepted, deduped }\`; \`401\` for an unknown \`source_id\` or
a token mismatch.

## Per-source dashboard

\`GET /s/:sourceId/*\` serves the \`@superbull/react\` SPA from the hub, with
\`basePath: /s/:sourceId/\` injected — the same UI a standalone board serves,
pointed at a remote source. \`GET|POST|PUT|PATCH|DELETE /s/:sourceId/api/*\` forwards
to that source's proxy URL with its stored bearer token attached, passing through
method, query string, body, and content type; a \`204\` upstream forwards with no
body. Unreachable proxies respond \`502 { "error": "proxy unreachable" }\`.

## Background jobs

\`apps/hub/src/scripts/start-queue-worker.ts\` runs two crons (single queue, worker
concurrency 5):

- **evaluate-alerts** — every 5 minutes. Evaluates every enabled alert rule against
  recent ingest data and sends alert emails for state transitions.
- **send-digest** — daily at 9am. Sends each alert rule's owner a 24-hour digest
  summary.

See [Alerts](/docs/alerts) for rule types and email behavior.
`;
