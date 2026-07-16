# @superbull/fastify

Fastify server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your own Fastify app, against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/fastify @superbull/api @superbull/react bullmq
```

`fastify` (`^5.0.0`) is a peer dependency.

## Usage

```ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { FastifyAdapter } from '@superbull/fastify';
import { Queue } from 'bullmq';
import Fastify from 'fastify';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new FastifyAdapter();
serverAdapter.setBasePath('/queues');
createBoard({ queues, serverAdapter });

const app = Fastify();
await app.register(serverAdapter.registerPlugin(), { prefix: '/queues' });
await app.listen({ port: 3000 });
```

The dashboard is now at `http://localhost:3000/queues`. `setBasePath` and the `prefix` you register the plugin under must match; omit both to serve from the root.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
