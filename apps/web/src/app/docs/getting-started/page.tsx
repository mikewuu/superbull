import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';

export const metadata: Metadata = {
  title: 'Getting started — SuperBull docs',
  description: 'Pick a mode, install the right packages, and open the dashboard.',
};

const content = `
# Getting started

SuperBull ships as a set of \`@superbull/*\` npm packages. \`bullmq\` is always a
**peer dependency** — SuperBull never bundles its own copy, so job mutations
(retry, promote, remove) run through the exact BullMQ version your workers use.

## 1. Pick a mode

- **Standalone** — you have one Node app and want a dashboard mounted inside it.
  No extra infrastructure. Go to [Standalone](/docs/standalone).
- **Proxy** — your workers run somewhere you'd rather not expose a UI to (a worker
  fleet, a container with no ingress), or you plan to federate multiple queue
  clusters into a hub. Go to [Proxy](/docs/proxy).
- **Hub** — you're running two or more sources (standalone boards or proxies) and
  want one place with analytics, alerts, error tracking, and status pages across
  all of them. Go to [Hub](/docs/hub).

Standalone and proxy are not mutually exclusive with hub — a hub federates proxies
(and can forward to a standalone board's API too), so most setups start with
standalone or proxy and add a hub later.

## 2. Install

Every mode needs \`@superbull/api\` and \`bullmq\`. Standalone additionally needs one
adapter package and \`@superbull/react\` (the UI):

\`\`\`bash
npm install @superbull/api @superbull/react bullmq
npm install @superbull/express   # or fastify, hono, koa, h3, hapi, elysia, bun, nestjs
\`\`\`

The proxy is a single package with its own CLI:

\`\`\`bash
npm install @superbull/proxy bullmq
\`\`\`

The hub is a full app (\`apps/hub\` in this repo) — see [Hub](/docs/hub) for
deployment and environment setup rather than an npm install.

## 3. Point it at Redis

SuperBull never opens its own Redis connection for queue data — it wraps the
\`bullmq.Queue\` instance(s) you already have:

\`\`\`ts
import { Queue } from 'bullmq';

const queue = new Queue('email', { connection: { host: '127.0.0.1', port: 6379 } });
\`\`\`

Pass that queue into a \`BullMQAdapter\` and hand it to \`createBoard()\` (standalone)
or \`startProxy()\` (proxy). Because each queue carries its own connection, a single
board or proxy can span multiple Redis instances by simply passing queues that
point at different \`connection\` configs — see [Configuration](/docs/configuration).

## 4. Open the dashboard

Standalone and hub both serve the \`@superbull/react\` SPA at whatever base path you
mounted it under (\`/admin/queues\` in the quickstart example, \`/s/:sourceId/\` on a
hub). The proxy has no UI of its own — it's meant to be read by a hub or a script,
and exposes \`GET /healthz\` unauthenticated for liveness checks.
`;

export default function GettingStartedPage() {
  return <DocsMarkdown content={content} />;
}
