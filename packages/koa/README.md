# @superbull/koa

Koa server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your own Koa app, against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/koa @superbull/api @superbull/react bullmq
```

`koa` (`^2.15.0 || ^3.0.0`) is a peer dependency.

## Usage

```ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { KoaAdapter } from '@superbull/koa';
import { Queue } from 'bullmq';
import Koa from 'koa';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new KoaAdapter();
createBoard({ queues, serverAdapter });

const app = new Koa();
app.use(serverAdapter.registerPlugin({ mount: '/' }));
app.listen(3000);
```

The dashboard is now at `http://localhost:3000`. To serve it under a sub-path, call `serverAdapter.setBasePath('/queues')` before `createBoard` and pass the same path as `mount`.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
