# @superbull/bun

Bun server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Serves the dashboard UI and its REST API straight from `Bun.serve` routes, against your app's own `bullmq` instance.

## Install

```bash
bun add @superbull/bun @superbull/api @superbull/react bullmq
```

`bun-types` is a peer dependency.

## Usage

```ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { BunAdapter } from '@superbull/bun';
import { Queue } from 'bullmq';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new BunAdapter();
serverAdapter.setBasePath('/');
createBoard({ queues, serverAdapter });

Bun.serve({
  port: 3000,
  routes: serverAdapter.getRoutes(),
  fetch() {
    return new Response('Not Found', { status: 404 });
  },
});
```

The dashboard is now at `http://localhost:3000`. `getRoutes()` returns a plain `Bun.serve` routes object, so the board composes with your app's other routes; pass a sub-path to `setBasePath` to serve it there instead.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
