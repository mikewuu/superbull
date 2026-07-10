import { createServer } from 'node:http';
import { createBoard } from '@superbull/api';
import { runServerAdapterContract, uiFixtureBasePath } from '@superbull/test-utils';
import { createApp, toNodeListener } from 'h3';
import { H3Adapter } from '../src/h3-adapter';

runServerAdapterContract('h3', async ({ basePath, queue }) => {
  const serverAdapter = new H3Adapter();
  serverAdapter.setBasePath(basePath);
  createBoard({
    queues: [queue.adapter],
    serverAdapter,
    options: { uiBasePath: uiFixtureBasePath },
  });

  const app = createApp();
  app.use(serverAdapter.registerHandlers());
  const server = createServer(toNodeListener(app));
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
