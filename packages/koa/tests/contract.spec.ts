import { createServer } from 'node:http';
import { createBoard } from '@bullwatch/api';
import { runServerAdapterContract, uiFixtureBasePath } from '@bullwatch/test-utils';
import Koa from 'koa';
import { KoaAdapter } from '../src/koa-adapter';

runServerAdapterContract('koa', async ({ basePath, queue }) => {
  const serverAdapter = new KoaAdapter();
  serverAdapter.setBasePath(basePath);
  createBoard({
    queues: [queue.adapter],
    serverAdapter,
    options: { uiBasePath: uiFixtureBasePath },
  });

  const app = new Koa();
  app.use(serverAdapter.registerPlugin({ mount: basePath || '/' }));
  const server = createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, resolve));

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
