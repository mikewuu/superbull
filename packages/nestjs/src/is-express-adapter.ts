import type { BoardExpressAdapter, BoardServerAdapter } from './types';

export function isExpressAdapter(adapter: BoardServerAdapter): adapter is BoardExpressAdapter {
  return 'getRouter' in adapter;
}
