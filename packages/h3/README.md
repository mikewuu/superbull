# @superbull/h3

h3 server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your own h3 app (Nitro, Nuxt, plain Node), against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/h3 @superbull/api @superbull/react bullmq
```

`h3` (`^1.15.0`) is a peer dependency.

## Usage

```ts
import { createServer } from 'node:http';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { H3Adapter } from '@superbull/h3';
import { Queue } from 'bullmq';
import { createApp, toNodeListener } from 'h3';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new H3Adapter();
createBoard({ queues, serverAdapter });

const app = createApp();
app.use(serverAdapter.registerHandlers());
createServer(toNodeListener(app)).listen(3000);
```

The dashboard is now at `http://localhost:3000`. To serve it under a sub-path, call `serverAdapter.setBasePath('/queues')` before `createBoard`.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
