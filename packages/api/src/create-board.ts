import { createRequire } from 'node:module';
import path from 'node:path';
import { handleError } from './handlers/handle-error';
import type { BaseAdapter } from './queue-adapters/base-adapter';
import { appRoutes } from './routes';
import type { BoardOptions, BoardQueues, IServerAdapter } from './types';

export function createBoard(args: {
  queues: ReadonlyArray<BaseAdapter>;
  serverAdapter: IServerAdapter;
  options?: BoardOptions;
}) {
  const { queues, serverAdapter, options = {} } = args;
  const registry = createQueueRegistry(queues);
  const uiBasePath = options.uiBasePath ?? resolveUiBasePath();

  serverAdapter
    .setQueues(registry.boardQueues)
    .setViewsPath(path.join(uiBasePath, 'dist'))
    .setStaticPath('/static', path.join(uiBasePath, 'dist/static'))
    .setUIConfig({ board_title: 'SuperBull', ...options.uiConfig })
    .setEntryRoute(appRoutes.entryPoint)
    .setErrorHandler(handleError)
    .setApiRoutes(appRoutes.api);

  return {
    setQueues: registry.setQueues,
    replaceQueues: registry.replaceQueues,
    addQueue: registry.addQueue,
    removeQueue: registry.removeQueue,
  };
}

function resolveUiBasePath(): string {
  const require = createRequire(import.meta.url);
  return path.dirname(require.resolve('@superbull/react/package.json'));
}

function createQueueRegistry(queues: ReadonlyArray<BaseAdapter>) {
  const boardQueues: BoardQueues = new Map();

  function setQueues(newQueues: ReadonlyArray<BaseAdapter>): void {
    for (const queue of newQueues) {
      boardQueues.set(queue.getName(), queue);
    }
  }

  function replaceQueues(newQueues: ReadonlyArray<BaseAdapter>): void {
    const namesToKeep = newQueues.map((queue) => queue.getName());
    for (const name of boardQueues.keys()) {
      if (!namesToKeep.includes(name)) {
        boardQueues.delete(name);
      }
    }
    setQueues(newQueues);
  }

  function addQueue(queue: BaseAdapter): void {
    boardQueues.set(queue.getName(), queue);
  }

  function removeQueue(queueOrName: string | BaseAdapter): void {
    const name = typeof queueOrName === 'string' ? queueOrName : queueOrName.getName();
    boardQueues.delete(name);
  }

  setQueues(queues);

  return { boardQueues, setQueues, replaceQueues, addQueue, removeQueue };
}
