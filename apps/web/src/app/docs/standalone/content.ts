export const intro = `
# Standalone

Standalone mode mounts SuperBull's UI and REST API directly inside your existing
Node process. There's one adapter package per framework; all nine implement the
same \`IServerAdapter\` lifecycle and are driven by the same \`createBoard()\` call
from \`@superbull/api\`.

## createBoard()

\`\`\`ts
import { createBoard } from '@superbull/api';

function createBoard(args: {
  queues: ReadonlyArray<BaseAdapter>;
  serverAdapter: IServerAdapter;
  options?: {
    uiBasePath?: string;      // default: dirname of the resolved @superbull/react package
    uiConfig?: {
      board_title?: string;   // default: 'SuperBull'
      polling_interval_ms?: number;
    };
  };
}): {
  setQueues(queues: ReadonlyArray<BaseAdapter>): void;
  replaceQueues(queues: ReadonlyArray<BaseAdapter>): void;
  addQueue(queue: BaseAdapter): void;
  removeQueue(queueOrName: string | BaseAdapter): void;
}
\`\`\`

Call \`setBasePath()\` on the server adapter **before** \`createBoard()\`. Most
adapters read it while wiring routes. \`createBoard()\` wires the adapter's views
path, static path, UI config, entry route, error handler, and API routes; it
returns a small handle for changing the mounted queue set at runtime (useful if
queues are created dynamically).

## Wrapping a queue

Wrap each \`bullmq.Queue\` in a \`BullMQAdapter\` before passing it to \`createBoard()\`:

\`\`\`ts
import { BullMQAdapter } from '@superbull/api';
import { Queue } from 'bullmq';

const queue = new Queue('email', { connection: { host: '127.0.0.1', port: 6379 } });
const adapter = new BullMQAdapter(queue, {
  readOnlyMode: false,
  allowRetries: true,
  allowCompletedRetries: true,
  displayName: 'Email',
  description: 'Transactional email delivery',
});
\`\`\`

\`BullMQAdapter\` throws if \`queue\` isn't a real \`bullmq.Queue\` instance. See
[Configuration](/docs/configuration) for every option and its default.

## Adapters
`;

export const adapterHeaders = ['Package', 'Peer dependency', 'Export', 'Mount method'];
export const adapterRows = [
  ['@superbull/express', 'express >=4.17.0', 'ExpressAdapter', 'getRouter()'],
  ['@superbull/fastify', 'fastify ^5.0.0', 'FastifyAdapter', 'registerPlugin()'],
  ['@superbull/hono', 'hono ^4.0.0', 'HonoAdapter', 'registerPlugin()'],
  ['@superbull/koa', 'koa ^2.15.0 || ^3.0.0', 'KoaAdapter', 'registerPlugin({ mount? })'],
  ['@superbull/h3', 'h3 ^1.15.0', 'H3Adapter', 'registerHandlers()'],
  ['@superbull/hapi', '@hapi/hapi ^21.0.0', 'HapiAdapter', 'registerPlugin()'],
  ['@superbull/elysia', 'elysia ^1.1.0', 'ElysiaAdapter', 'registerPlugin()'],
  ['@superbull/bun', 'Bun runtime', 'BunAdapter', 'getRoutes()'],
  [
    '@superbull/nestjs',
    '@nestjs/common, core, bullmq ^10 || ^11',
    'BoardModule',
    'BoardModule.forRoot()',
  ],
];

export const perAdapter = `
### Express

\`\`\`bash
npm install @superbull/api @superbull/express @superbull/react bullmq
\`\`\`

\`\`\`ts
import { createServer } from 'node:http';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import express from 'express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const app = express();
app.use('/admin/queues', serverAdapter.getRouter());
createServer(app).listen(3000);
\`\`\`

### Fastify

\`\`\`bash
npm install @superbull/api @superbull/fastify @superbull/react bullmq
\`\`\`

\`\`\`ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { FastifyAdapter } from '@superbull/fastify';
import Fastify from 'fastify';

const serverAdapter = new FastifyAdapter();
serverAdapter.setBasePath('/admin/queues');
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const app = Fastify();
await app.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });
await app.listen({ port: 3000 });
\`\`\`

If \`setBasePath()\` isn't called, the adapter falls back to Fastify's own \`prefix\`
option passed to \`register()\`.

### Hono

\`\`\`bash
npm install @superbull/api @superbull/hono @superbull/react bullmq hono @hono/node-server
\`\`\`

\`HonoAdapter\` takes a \`serveStatic\` middleware factory in its constructor so it
stays runtime-agnostic (Node, Cloudflare Workers, Bun, Deno):

\`\`\`ts
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { HonoAdapter } from '@superbull/hono';
import { Hono } from 'hono';

const serverAdapter = new HonoAdapter(serveStatic);
serverAdapter.setBasePath('/admin/queues');
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const app = new Hono();
app.route('/admin/queues', serverAdapter.registerPlugin());
serve({ fetch: app.fetch, port: 3000 });
\`\`\`

Hono is strict about trailing slashes. Mount both \`/admin/queues\` and
\`/admin/queues/\` if you link to the board without a trailing slash elsewhere.

### Koa

\`\`\`bash
npm install @superbull/api @superbull/koa @superbull/react bullmq koa
\`\`\`

\`\`\`ts
import { createServer } from 'node:http';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { KoaAdapter } from '@superbull/koa';
import Koa from 'koa';

const serverAdapter = new KoaAdapter();
serverAdapter.setBasePath('/admin/queues');
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const app = new Koa();
app.use(serverAdapter.registerPlugin({ mount: '/admin/queues' }));
createServer(app.callback()).listen(3000);
\`\`\`

\`registerPlugin({ mount })\` overrides the base path used for route prefixing.
Omit it to fall back to whatever \`setBasePath()\` set.

### h3

\`\`\`bash
npm install @superbull/api @superbull/h3 @superbull/react bullmq h3
\`\`\`

\`\`\`ts
import { createServer } from 'node:http';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { H3Adapter } from '@superbull/h3';
import { createApp, toNodeListener } from 'h3';

const serverAdapter = new H3Adapter();
serverAdapter.setBasePath('/admin/queues');
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const app = createApp();
app.use(serverAdapter.registerHandlers());
createServer(toNodeListener(app)).listen(3000);
\`\`\`

### Hapi

\`\`\`bash
npm install @superbull/api @superbull/hapi @superbull/react bullmq @hapi/hapi
\`\`\`

\`\`\`ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { HapiAdapter } from '@superbull/hapi';
import Hapi from '@hapi/hapi';

const serverAdapter = new HapiAdapter();
serverAdapter.setBasePath('/admin/queues');
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const server = Hapi.server({ port: 3000 });
await server.register({
  plugin: serverAdapter.registerPlugin(),
  routes: { prefix: '/admin/queues' },
});
await server.start();
\`\`\`

The plugin registers as \`@superbull/hapi\` and depends on \`@hapi/vision\` and
\`@hapi/inert\` internally for view rendering and static files.

### Elysia

\`\`\`bash
npm install @superbull/api @superbull/elysia @superbull/react bullmq elysia
\`\`\`

Elysia's adapter takes its base path at construction instead of via
\`setBasePath()\`:

\`\`\`ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { ElysiaAdapter } from '@superbull/elysia';
import { Elysia } from 'elysia';

const serverAdapter = new ElysiaAdapter({ prefix: '/admin/queues', basePath: '/admin/queues' });
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const plugin = await serverAdapter.registerPlugin();
new Elysia().use(plugin).listen(3000);
\`\`\`

### Bun

\`\`\`bash
npm install @superbull/api @superbull/bun @superbull/react bullmq
\`\`\`

Runs under the Bun runtime and mounts onto \`Bun.serve\`'s native \`routes\` object
rather than a middleware function:

\`\`\`ts
import { BullMQAdapter, createBoard } from '@superbull/api';
import { BunAdapter } from '@superbull/bun';

const serverAdapter = new BunAdapter();
serverAdapter.setBasePath('/admin/queues');
createBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

Bun.serve({
  port: 3000,
  routes: serverAdapter.getRoutes(),
  fetch: () => new Response('Not Found', { status: 404 }),
});
\`\`\`

### NestJS

\`\`\`bash
npm install @superbull/api @superbull/nestjs @superbull/express @superbull/react bullmq @nestjs/bullmq
\`\`\`

\`BoardModule.forRoot()\` wires an adapter class. Only \`ExpressAdapter\` (on
Nest's default Express platform) and \`FastifyAdapter\` (on Fastify) work: the
module mounts through \`getRouter\` or \`registerPlugin\` respectively, and the
other adapters either lack those methods or target servers Nest doesn't run
on:

\`\`\`ts
import { Module } from '@nestjs/common';
import { ExpressAdapter } from '@superbull/express';
import { BoardModule, InjectBoard } from '@superbull/nestjs';
import type { BoardInstance } from '@superbull/nestjs';

@Module({
  imports: [
    BoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
      boardOptions: { uiConfig: { board_title: 'my app' } },
    }),
  ],
})
export class AppModule {}

class SomeService {
  constructor(@InjectBoard() private board: BoardInstance) {}

  register(queue: Queue) {
    this.board.addQueue(new BullMQAdapter(queue));
  }
}
\`\`\`

\`BoardModule.forFeature(...queues)\` registers additional queues from a feature
module. Each entry is \`{ name | queue, adapter, options? }\`.
`;
