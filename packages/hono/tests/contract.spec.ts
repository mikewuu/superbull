import { createBoard } from '@superbull/api';
import { runServerAdapterContract, uiFixtureBasePath } from '@superbull/test-utils';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { HonoAdapter } from '../src/hono-adapter';

runServerAdapterContract('hono', async ({ basePath, queue }) => {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath(basePath || '/');
  createBoard({
    queues: [queue.adapter],
    serverAdapter,
    options: { uiBasePath: uiFixtureBasePath },
  });

  const board = serverAdapter.registerPlugin();
  const app = new Hono();
  app.route(basePath || '/', board);
  if (basePath) {
    // hono routes are strict about trailing slashes: mounting the board a second
    // time under `${basePath}/` makes GET `${basePath}/` resolve the entry route.
    app.route(`${basePath}/`, board);
  }

  const server = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' });
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));

  const address = server.address();
  if (!address || typeof address !== 'object') {
    throw new Error('server has no address');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    request: async ({ method, path, body }) => {
      const res = await fetch(`${baseUrl}${path}`, {
        method: method.toUpperCase(),
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') ?? undefined },
        text: await res.text(),
      };
    },
    teardown: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
});
