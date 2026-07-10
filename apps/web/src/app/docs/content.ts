export const content = `
# SuperBull

SuperBull is a dashboard for [BullMQ](https://docs.bullmq.io). It embeds into your
existing Node app through a thin server adapter and renders a React SPA that polls
a REST API driven by your own \`bullmq\` \`Queue\` instances — job mutations (retry,
promote, remove, clean) always run against the exact BullMQ version your workers use.

There are three ways to run it:

- **Standalone** — mount an adapter (Express, Fastify, Hono, Koa, h3, Hapi, Elysia,
  Bun, or NestJS) directly in your app. Serves the UI and the REST API from that
  process. See [Standalone](/docs/standalone).
- **Proxy** — run \`@superbull/proxy\` as a headless agent next to your workers. It
  exposes the same REST API over a bearer token, with no UI, meant to sit behind a
  hub or your own tooling. See [Proxy](/docs/proxy).
- **Hub** — a separate Next.js app that federates multiple proxies into one place,
  with ingest-driven analytics, error tracking, email alerts, dashboards, and public
  status pages, all stored in Convex. See [Hub](/docs/hub).

All three modes share the same core: \`@superbull/api\` defines the route table, the
\`BaseAdapter\`/\`BullMQAdapter\` queue wrapper, and \`createBoard()\`; \`@superbull/react\`
is the SPA served by every standalone adapter and by the hub's per-source dashboards.

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
the same shape — see [Standalone](/docs/standalone) for all nine.

## Where to go next

- New to SuperBull — start with [Getting started](/docs/getting-started).
- Embedding in your app — [Standalone](/docs/standalone).
- Running next to workers with no UI — [Proxy](/docs/proxy).
- Centralizing multiple sources — [Hub](/docs/hub).
- Every endpoint — [REST API](/docs/api).
- Driving SuperBull from an agent — [MCP](/docs/mcp).
`;
