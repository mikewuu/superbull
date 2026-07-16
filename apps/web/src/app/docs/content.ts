export const introContent = `
# SuperBull

SuperBull is a dashboard for [BullMQ](https://docs.bullmq.io). It embeds into your
existing Node app through a thin server adapter and renders a React SPA that polls
a REST API driven by your own \`bullmq\` \`Queue\` instances. Job mutations (retry,
promote, remove, clean) always run against the exact BullMQ version your workers use.

There are two ways to run it:

- **Hosted**: sign in with Google, create a connector in your workspace, and run
  one command next to your workers: \`npx @superbull/connector --token ...\`. It
  opens a single outbound WebSocket, no inbound port, no public URL. Your
  connector's dashboard goes live at
  \`/app/[workspaceSlug]/connectors/[connectorId]\`, alongside ingest-driven
  analytics, error tracking, email alerts, dashboards, and public status pages
  for every connector in the workspace. See [Getting started](/docs/getting-started),
  [Connector](/docs/connector), and [Hosted app](/docs/hub).
- **Standalone**: mount an adapter (Express, Fastify, Hono, Koa, h3, Hapi, Elysia,
  Bun, or NestJS) directly in your app. Serves the UI and the REST API from that
  process, no sign-in, no hosted app involved. See [Standalone](/docs/standalone).

Both modes share the same core: \`@superbull/api\` defines the route table, the
\`BaseAdapter\`/\`BullMQAdapter\` queue wrapper, and \`createBoard()\`; \`@superbull/react\`
is the SPA served by every standalone adapter and by the hosted app's
per-connector dashboards.
`;

export const quickstartContent = `
## Let your agent run it

SuperBull isn't only for humans watching a dashboard. Point an agent at the
hosted app's MCP server and it can watch your queues, open a failed job and read its
stack trace, retry the job, or pause a queue that's failing fast. No clicking
through a UI. See [MCP](/docs/mcp) to connect one.

## Quickstart

Mount the Express adapter against one queue:

\`\`\`bash
npm install @superbull/api @superbull/express @superbull/react bullmq
\`\`\`

\`\`\`ts
import { createServer } from 'node:http';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import { Queue } from 'bullmq';
import express from 'express';

const emailQueue = new Queue('email', { connection: { host: '127.0.0.1', port: 6379 } });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

const app = express();
app.use('/admin/queues', serverAdapter.getRouter());
createServer(app).listen(3000);
\`\`\`

Open \`http://localhost:3000/admin/queues\`. Every other framework adapter follows
the same shape. See [Standalone](/docs/standalone) for all nine.

## Where to go next

- New to SuperBull: start with [Getting started](/docs/getting-started).
- Embedding in your app instead: [Standalone](/docs/standalone).
- Running the outbound agent next to workers: [Connector](/docs/connector).
- The hosted app: workspaces, analytics, alerts, status pages: [Hosted app](/docs/hub).
- Every endpoint: [REST API](/docs/api).
- Driving SuperBull from an agent: [MCP](/docs/mcp).
`;
