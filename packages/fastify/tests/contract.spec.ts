import { createBoard } from '@bullwatch/api';
import { runServerAdapterContract, uiFixtureBasePath } from '@bullwatch/test-utils';
import Fastify from 'fastify';
import { FastifyAdapter } from '../src/fastify-adapter';

runServerAdapterContract('fastify', async ({ basePath, queue }) => {
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath(basePath);
  createBoard({
    queues: [queue.adapter],
    serverAdapter,
    options: { uiBasePath: uiFixtureBasePath },
  });

  const app = Fastify();
  await app.register(serverAdapter.registerPlugin(), { prefix: basePath || undefined });
  await app.listen({ port: 0, host: '127.0.0.1' });

  const address = app.server.address();
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
    teardown: () => app.close(),
  };
});
