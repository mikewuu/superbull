# @superbull/elysia

Elysia server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your own Elysia app, against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/elysia @superbull/api @superbull/react bullmq
```

`elysia` (`^1.1.0`) is a peer dependency.

## Usage

```ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { ElysiaAdapter } from '@superbull/elysia';
import { Queue } from 'bullmq';
import { Elysia } from 'elysia';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new ElysiaAdapter();
createBoard({ queues, serverAdapter });

const app = new Elysia().use(await serverAdapter.registerPlugin()).listen(3000);
```

The dashboard is now at `http://localhost:3000`. Note that `registerPlugin()` is async. To serve it under a sub-path, construct the adapter with `new ElysiaAdapter({ prefix: '/queues', basePath: '/queues' })`.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
