import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { LatencyPoint } from './types';

export async function getLatencySeries(args: {
  sourceId: string;
  queueName?: string;
  fromTs: number;
  toTs: number;
  bucketMinutes: number;
}): Promise<LatencyPoint[]> {
  const client = createServerConvexClient();
  const ref = anyApi.analytics?.latencySeries;
  if (!ref) {
    throw new Error('missing analytics.latencySeries function reference');
  }
  return await client.query(ref, args);
}
