import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';

export interface DigestSourceSummary {
  sourceId: string;
  sourceName: string;
  completed: number;
  failed: number;
  topErrorGroups: Array<{ message: string; queueName: string; count: number }>;
}

export async function getAlertDigestSummary(sinceTs: number): Promise<{
  perSource: DigestSourceSummary[];
}> {
  const client = createServerConvexClient();
  return await client.query(api.alerts.digestSummary, { sinceTs });
}
