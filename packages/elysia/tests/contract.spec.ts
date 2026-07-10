import { createBoard } from '@superbull/api';
import { runServerAdapterContract, uiFixtureBasePath } from '@superbull/test-utils';
import { Elysia } from 'elysia';
import { ElysiaAdapter } from '../src/elysia-adapter';

runServerAdapterContract('elysia', async ({ basePath, queue }) => {
  const serverAdapter = new ElysiaAdapter({ prefix: basePath, basePath });
  createBoard({
    queues: [queue.adapter],
    serverAdapter,
    options: { uiBasePath: uiFixtureBasePath },
  });

  const plugin = await serverAdapter.registerPlugin();
  const app = new Elysia().use(plugin);

  return {
    request: async ({ method, path, body }) => {
      const res = await app.handle(
        new Request(`http://localhost${path}`, {
          method: method.toUpperCase(),
          headers: body === undefined ? undefined : { 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      return {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') ?? undefined },
        text: await res.text(),
      };
    },
    teardown: async () => undefined,
  };
});
