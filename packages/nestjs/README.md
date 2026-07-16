# @superbull/nestjs

NestJS module for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). Mounts the dashboard UI and its REST API inside your Nest app and picks queues up from `@nestjs/bullmq`, so job actions run against your app's own `bullmq` instance.

## Install

```bash
pnpm add @superbull/nestjs @superbull/api @superbull/react @superbull/express bullmq
```

Peer dependencies: `@superbull/api`, `@nestjs/bullmq`, `@nestjs/common`, `@nestjs/core` (`^10 || ^11`), `reflect-metadata`, `rxjs`. The board itself is served by an HTTP adapter; use `@superbull/express` on the default Express platform or `@superbull/fastify` on Fastify.

## Usage

```ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BullMQAdapter } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import { BoardModule } from '@superbull/nestjs';

@Module({
  imports: [
    BullModule.forRoot({ connection: { host: '127.0.0.1', port: 6379 } }),
    BullModule.registerQueue({ name: 'my-queue' }),
    BoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter }),
    BoardModule.forFeature({ name: 'my-queue', adapter: BullMQAdapter }),
  ],
})
export class AppModule {}
```

The dashboard is now at `/queues`.

- `BoardModule.forRoot({ route, adapter, boardOptions?, middleware? })` mounts the board; `middleware` guards it (auth), `boardOptions` passes through to `createBoard`.
- `BoardModule.forRootAsync({ useFactory, imports?, inject? })` is the async variant.
- `BoardModule.forFeature(...queues)` registers queues from any feature module. Each entry is `{ name }` (resolved from `@nestjs/bullmq`) or `{ queue }` (a `bullmq` `Queue` instance), plus `adapter` and optional per-queue `options` (`readOnlyMode`, `allowRetries`, ...).
- `@InjectBoard()` injects the live board registry (`addQueue`, `removeQueue`, `replaceQueues`, `setQueues`) for runtime changes.

The `createBoard` API and per-queue options are documented in [@superbull/api](https://www.npmjs.com/package/@superbull/api); the full route reference is at [superbull.com/docs/api](https://superbull.com/docs/api).

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
