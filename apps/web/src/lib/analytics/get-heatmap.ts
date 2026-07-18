import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { HeatmapResult } from './types';

export async function getHeatmap(args: {
  projectId: Id<'projects'>;
  connectorId: Id<'connectors'>;
  fromTs: number;
  toTs: number;
}): Promise<HeatmapResult> {
  const token = await convexAuthNextjsToken();
  return await fetchQuery(api.analytics.heatmap, args, { token });
}
