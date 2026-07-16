# @superbull/api

Framework-agnostic core of [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). It owns the queue adapter, the REST route table, and every request handler; a thin server adapter (`@superbull/express`, `@superbull/fastify`, `@superbull/hono`, ...) mounts that route table inside your app and serves the UI. Because the board wraps your app's own `bullmq` `Queue` instances, job actions are always version-correct.

## Install

```bash
pnpm add @superbull/api @superbull/react bullmq
```

`@superbull/react` (the prebuilt dashboard UI) and `bullmq` (`^5.0.0`) are peer dependencies. You will almost always install a server adapter too; see the [Express quick start](https://www.npmjs.com/package/@superbull/express) for a runnable example.

## Usage

```ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import { Queue } from 'bullmq';

const connection = { host: '127.0.0.1', port: 6379 };

const board = createBoard({
  queues: [
    new BullMQAdapter(new Queue('send-emails', { connection })),
    new BullMQAdapter(new Queue('billing', { connection }), { readOnlyMode: true }),
  ],
  serverAdapter: new ExpressAdapter(),
  options: { uiConfig: { board_title: 'Jobs' } },
});
```

### `createBoard({ queues, serverAdapter, options? })`

- `queues`: `ReadonlyArray<BaseAdapter>`, one `BullMQAdapter` per queue.
- `serverAdapter`: any `IServerAdapter` implementation; `createBoard` wires views, statics, the entry route, and the API routes into it.
- `options.uiBasePath`: where the UI build lives. Defaults to the directory of `@superbull/react/package.json`.
- `options.uiConfig`: `Partial<{ board_title, polling_interval_ms }>`, merged over `{ board_title: 'SuperBull' }`.

Returns a live queue registry: `{ setQueues, replaceQueues, addQueue, removeQueue }`. Use it to add or remove queues after startup without remounting the adapter.

### Per-queue options

`new BullMQAdapter(queue, options?)` accepts:

| Option | Default | Effect |
| --- | --- | --- |
| `readOnlyMode` | `false` | Every mutating route returns `405 {"error":"queue is read-only"}` |
| `allowRetries` | `true` | Forced `false` in read-only mode; when `false`, retry routes return 405 |
| `allowCompletedRetries` | `true` | Allow retrying completed (not just failed) jobs; requires `allowRetries` |
| `prefix` | | BullMQ key prefix for this queue |
| `displayName`, `description` | `''` | Shown in the UI instead of / next to the raw queue name |
| `format` | | `(field: 'data' \| 'return_value', value) => unknown` redaction hook applied to job payloads before they leave the API |

## Exports

`createBoard`, `BullMQAdapter`, `BaseAdapter` (extend it to support other queue libraries), `formatJob`, `appRoutes` (the raw route table, used by headless consumers like `@superbull/connector`), plus all public types.

The full HTTP route reference (queues, jobs, metrics, workers, stats, Prometheus, bulk actions) lives at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
