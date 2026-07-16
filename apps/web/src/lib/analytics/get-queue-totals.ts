import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { QueueTotal } from './types';

export async function getQueueTotals(args: {
  sourceId: string;
  fromTs: number;
  toTs: number;
}): Promise<QueueTotal[]> {
  const client = createServerConvexClient();
  const ref = anyApi.analytics?.queueTotals;
  if (!ref) {
    throw new Error('missing analytics.queueTotals function reference');
  }
  return await client.query(ref, args);
}
