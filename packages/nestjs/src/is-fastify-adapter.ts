import type { BoardFastifyAdapter, BoardServerAdapter } from './types';

export function isFastifyAdapter(adapter: BoardServerAdapter): adapter is BoardFastifyAdapter {
  return 'registerPlugin' in adapter;
}
