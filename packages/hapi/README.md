# @superbull/hapi

hapi server adapter for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your own hapi server, against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/hapi @superbull/api @superbull/react bullmq
```

`@hapi/hapi` (`^21.0.0`) is a peer dependency.

## Usage

```ts
import Hapi from '@hapi/hapi';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { HapiAdapter } from '@superbull/hapi';
import { Queue } from 'bullmq';

const connection = { host: '127.0.0.1', port: 6379 };
const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];

const serverAdapter = new HapiAdapter();
createBoard({ queues, serverAdapter });

const server = Hapi.server({ port: 3000 });
await server.register({ plugin: serverAdapter.registerPlugin() });
await server.start();
```

The dashboard is now at `http://localhost:3000`. To serve it under a sub-path, call `serverAdapter.setBasePath('/queues')` before `createBoard` and register the plugin with `routes: { prefix: '/queues' }`.

Per-queue options (`readOnlyMode`, `allowRetries`, payload redaction, ...) and the `createBoard` API are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
