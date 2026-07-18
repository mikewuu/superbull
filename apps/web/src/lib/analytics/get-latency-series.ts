import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { LatencySeriesResult } from './types';

export async function getLatencySeries(args: {
  projectId: Id<'projects'>;
  connectorId: Id<'connectors'>;
  queueName?: string;
  fromTs: number;
  toTs: number;
  bucketMinutes: number;
}): Promise<LatencySeriesResult> {
  const token = await convexAuthNextjsToken();
  return await fetchQuery(api.analytics.latencySeries, args, { token });
}
