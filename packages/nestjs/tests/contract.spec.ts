import 'reflect-metadata';
import { ExpressAdapter } from '@bullwatch/express';
import { runServerAdapterContract, uiFixtureBasePath } from '@bullwatch/test-utils';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter as NestExpressAdapter } from '@nestjs/platform-express';
import { BoardModule } from '../src/board-module';
import { boardInstanceToken } from '../src/constants';
import type { BoardInstance } from '../src/types';

runServerAdapterContract('nestjs', async ({ basePath, queue }) => {
  const route = basePath || '/';

  const appModule = BoardModule.forRoot({
    route,
    adapter: ExpressAdapter,
    boardOptions: { uiBasePath: uiFixtureBasePath },
  });

  const app = await NestFactory.create(appModule, new NestExpressAdapter(), { logger: false });
  await app.init();

  const board = app.get<BoardInstance>(boardInstanceToken);
  board.addQueue(queue.adapter);

  await app.listen(0);
  const address = app.getHttpServer().address();
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
