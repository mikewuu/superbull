import Hapi from '@hapi/hapi';
import { createBoard } from '@superbull/api';
import { runServerAdapterContract, uiFixtureBasePath } from '@superbull/test-utils';
import { HapiAdapter } from '../src/hapi-adapter';

runServerAdapterContract('hapi', async ({ basePath, queue }) => {
  const serverAdapter = new HapiAdapter();
  serverAdapter.setBasePath(basePath);
  createBoard({
    queues: [queue.adapter],
    serverAdapter,
    options: { uiBasePath: uiFixtureBasePath },
  });

  const server = Hapi.server({
    port: 0,
    host: '127.0.0.1',
    router: { stripTrailingSlash: true },
  });
  await server.register({
    plugin: serverAdapter.registerPlugin(),
    ...(basePath ? { routes: { prefix: basePath } } : {}),
  });
  await server.start();

  const baseUrl = `http://127.0.0.1:${server.info.port}`;

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
    teardown: () => server.stop(),
  };
});
