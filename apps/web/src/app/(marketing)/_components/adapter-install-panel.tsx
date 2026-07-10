'use client';

import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { CopyButton } from './copy-button';

type AdapterId =
  | 'express'
  | 'fastify'
  | 'hono'
  | 'koa'
  | 'h3'
  | 'hapi'
  | 'elysia'
  | 'bun'
  | 'nestjs';

const adapterIds: AdapterId[] = [
  'express',
  'fastify',
  'hono',
  'koa',
  'h3',
  'hapi',
  'elysia',
  'bun',
  'nestjs',
];

const adapters: Record<AdapterId, { label: string; code: string }> = {
  express: {
    label: 'Express',
    code: `import { BullMQAdapter, createBoard } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import { Queue } from 'bullmq';
import express from 'express';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new ExpressAdapter();
createBoard({ queues, serverAdapter });

const app = express();
app.use('/', serverAdapter.getRouter());
app.listen(3000);`,
  },
  fastify: {
    label: 'Fastify',
    code: `import { BullMQAdapter, createBoard } from '@superbull/api';
import { FastifyAdapter } from '@superbull/fastify';
import { Queue } from 'bullmq';
import Fastify from 'fastify';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new FastifyAdapter();
createBoard({ queues, serverAdapter });

const app = Fastify();
await app.register(serverAdapter.registerPlugin());
await app.listen({ port: 3000 });`,
  },
  hono: {
    label: 'Hono',
    code: `import { BullMQAdapter, createBoard } from '@superbull/api';
import { HonoAdapter } from '@superbull/hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Queue } from 'bullmq';
import { Hono } from 'hono';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new HonoAdapter(serveStatic);
createBoard({ queues, serverAdapter });

const app = new Hono();
app.route('/', serverAdapter.registerPlugin());
serve({ fetch: app.fetch, port: 3000 });`,
  },
  koa: {
    label: 'Koa',
    code: `import { BullMQAdapter, createBoard } from '@superbull/api';
import { KoaAdapter } from '@superbull/koa';
import { Queue } from 'bullmq';
import Koa from 'koa';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new KoaAdapter();
createBoard({ queues, serverAdapter });

const app = new Koa();
app.use(serverAdapter.registerPlugin({ mount: '/' }));
app.listen(3000);`,
  },
  h3: {
    label: 'H3',
    code: `import { createServer } from 'node:http';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { H3Adapter } from '@superbull/h3';
import { Queue } from 'bullmq';
import { createApp, toNodeListener } from 'h3';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new H3Adapter();
createBoard({ queues, serverAdapter });

const app = createApp();
app.use(serverAdapter.registerHandlers());
createServer(toNodeListener(app)).listen(3000);`,
  },
  hapi: {
    label: 'Hapi',
    code: `import Hapi from '@hapi/hapi';
import { BullMQAdapter, createBoard } from '@superbull/api';
import { HapiAdapter } from '@superbull/hapi';
import { Queue } from 'bullmq';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new HapiAdapter();
createBoard({ queues, serverAdapter });

const server = Hapi.server({ port: 3000 });
await server.register({ plugin: serverAdapter.registerPlugin() });
await server.start();`,
  },
  elysia: {
    label: 'Elysia',
    code: `import { BullMQAdapter, createBoard } from '@superbull/api';
import { ElysiaAdapter } from '@superbull/elysia';
import { Queue } from 'bullmq';
import { Elysia } from 'elysia';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new ElysiaAdapter();
createBoard({ queues, serverAdapter });

const app = new Elysia().use(await serverAdapter.registerPlugin());
app.listen(3000);`,
  },
  bun: {
    label: 'Bun',
    code: `import { BullMQAdapter, createBoard } from '@superbull/api';
import { BunAdapter } from '@superbull/bun';
import { Queue } from 'bullmq';

const queues = [new BullMQAdapter(new Queue('my-queue', { connection }))];
const serverAdapter = new BunAdapter();
createBoard({ queues, serverAdapter });

Bun.serve({ port: 3000, routes: serverAdapter.getRoutes() });`,
  },
  nestjs: {
    label: 'NestJS',
    code: `import { Module } from '@nestjs/common';
import { BullMQAdapter } from '@superbull/api';
import { ExpressAdapter } from '@superbull/express';
import { BoardModule } from '@superbull/nestjs';

@Module({
  imports: [
    BoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter }),
    BoardModule.forFeature({ name: 'my-queue', adapter: BullMQAdapter }),
  ],
})
export class AppModule {}`,
  },
};

export function AdapterInstallPanel(): React.ReactElement {
  const [id, setId] = useState<AdapterId>('express');
  const active = adapters[id];

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-bg-inverted shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
      <div className="flex flex-wrap gap-1 border-b border-white/10 px-3 pt-3 pb-2">
        {adapterIds.map((adapterId) => (
          <button
            key={adapterId}
            type="button"
            onClick={() => setId(adapterId)}
            className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', {
              'bg-white/10 text-white': id === adapterId,
              'text-white/40 hover:text-white/70': id !== adapterId,
            })}
          >
            {adapters[adapterId].label}
          </button>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="absolute top-3 right-3">
          <CopyButton text={active.code} />
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-white/85">
          {active.code}
        </pre>
      </div>
    </div>
  );
}
