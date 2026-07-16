import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { LatencyPoint } from './types';

export async function getLatencySeries(args: {
  workspaceId: Id<'workspaces'>;
  connectorId: Id<'connectors'>;
  queueName?: string;
  fromTs: number;
  toTs: number;
  bucketMinutes: number;
}): Promise<LatencyPoint[]> {
  const token = await convexAuthNextjsToken();
  return await fetchQuery(api.analytics.latencySeries, args, { token });
}
