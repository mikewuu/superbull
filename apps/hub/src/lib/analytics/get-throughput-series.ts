import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { ThroughputPoint } from './types';

export async function getThroughputSeries(args: {
  sourceId: string;
  queueName?: string;
  fromTs: number;
  toTs: number;
  bucketMinutes: number;
}): Promise<ThroughputPoint[]> {
  const client = createServerConvexClient();
  const ref = anyApi.analytics?.throughputSeries;
  if (!ref) {
    throw new Error('missing analytics.throughputSeries function reference');
  }
  return await client.query(ref, args);
}
