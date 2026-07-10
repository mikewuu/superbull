import { createBoard } from '@superbull/api';
import { runServerAdapterContract, uiFixtureBasePath } from '@superbull/test-utils';
import { BunAdapter } from '../src/bun-adapter';

runServerAdapterContract('bun', async ({ basePath, queue }) => {
  const serverAdapter = new BunAdapter();
  serverAdapter.setBasePath(basePath || '/');
  createBoard({
    queues: [queue.adapter],
    serverAdapter,
    options: { uiBasePath: uiFixtureBasePath },
  });

  const server = Bun.serve({
    port: 0,
    routes: serverAdapter.getRoutes(),
    fetch() {
      return new Response('Not Found', { status: 404 });
    },
  });
  const baseUrl = server.url.toString().replace(/\/$/, '');

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
    teardown: async () => {
      await server.stop(true);
    },
  };
});
