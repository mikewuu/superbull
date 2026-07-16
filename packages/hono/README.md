# @superbull/hono

Hono server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your own Hono app, against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/hono @superbull/api @superbull/react bullmq
```

`hono` (`^4.0.0`) is a peer dependency. The constructor takes your runtime's `serveStatic` (for example `@hono/node-server/serve-static` on Node).

## Usage

```ts
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { HonoAdapter } from '@superbull/hono';
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

The dashboard is now at `http://localhost:3000`. To serve it under a sub-path, call `serverAdapter.setBasePath('/queues')` before `createBoard` and `app.route('/queues', ...)` with the same path.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
