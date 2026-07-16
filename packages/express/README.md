# @superbull/express

Express server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your own Express app, against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/express @superbull/api @superbull/react bullmq
```

`express` (`>=4.17.0`) is a peer dependency.

## Usage

```ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
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

The dashboard is now at `http://localhost:3000`. To serve it under a sub-path, call `serverAdapter.setBasePath('/admin/queues')` before `createBoard` and mount the router at that same path.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
