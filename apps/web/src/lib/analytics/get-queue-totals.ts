import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { QueueTotalsResult } from './types';

export async function getQueueTotals(args: {
  projectId: Id<'projects'>;
  connectorId: Id<'connectors'>;
  fromTs: number;
  toTs: number;
}): Promise<QueueTotalsResult> {
  const token = await convexAuthNextjsToken();
  return await fetchQuery(api.analytics.queueTotals, args, { token });
}
