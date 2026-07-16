import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { HeatmapResult } from './types';

export async function getHeatmap(args: {
  sourceId: string;
  fromTs: number;
  toTs: number;
}): Promise<HeatmapResult> {
  const client = createServerConvexClient();
  const ref = anyApi.analytics?.heatmap;
  if (!ref) {
    throw new Error('missing analytics.heatmap function reference');
  }
  return await client.query(ref, args);
}
