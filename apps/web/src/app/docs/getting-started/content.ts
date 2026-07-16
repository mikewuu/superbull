export const content = `
# Getting started

The fastest path to a working dashboard is the hosted app: sign in, add a
connector, run one command.

## 1. Sign in

Sign in with Google. A personal workspace is created for you automatically on
first sign-in, no separate signup step. From there you can invite teammates
to that workspace, or create more workspaces for other teams or environments.
Members hold one of three roles: **owner**, **admin**, or **member**; invite
by email from workspace settings.

## 2. Create a connector

From your workspace, **Connectors → New connector** gives you a name field and,
once submitted, a one-time enrollment token. It's shown exactly once, so copy
it before moving on. Behind the scenes the workspace only stores a hash of it.

## 3. Run it next to your workers

\`\`\`bash
npx @superbull/connector --token <the-token-you-copied>
\`\`\`

No install step, no code changes, and nothing to expose: the connector opens
one outbound WebSocket to \`wss://connect.superbull.com\` and reads your
BullMQ queues over the Redis connection you already run. See
[Connector](/docs/connector) for the full flag list (Redis host/port/password,
explicit queue names, etc.).

## 4. Watch it live

As soon as the connector connects, its dashboard goes live at
\`/app/[workspaceSlug]/connectors/[connectorId]\`: queues, jobs, retries,
metrics, the same dense board either way you run SuperBull. Ingested events
also feed workspace-wide [alerts](/docs/alerts), [analytics](/docs/analytics),
[dashboards](/docs/dashboards), and [status pages](/docs/status-pages).

Rather have an agent do this instead of clicking through a UI? See
[MCP](/docs/mcp): an agent can watch queues and fix failed jobs directly.

## Prefer to self-host?

None of the above requires the hosted app. **Standalone** mode mounts
SuperBull's UI and REST API directly inside your own Node process, no
workspace, no sign-in, no outbound connection to anywhere. \`bullmq\` is always
a **peer dependency** there too, so job mutations (retry, promote, remove) run
through the exact BullMQ version your workers use.

\`\`\`bash
npm install @superbull/api @superbull/react bullmq
npm install @superbull/express   # or fastify, hono, koa, h3, hapi, elysia, bun, nestjs
\`\`\`

See [Standalone](/docs/standalone) for the full setup, one section per
framework adapter.
`;
