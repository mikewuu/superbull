import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';

export interface IngestEventInput {
  uuid: string;
  type: string;
  queueName: string;
  jobName?: string;
  jobId?: string;
  ts: number;
  durationMs?: number;
  waitMs?: number;
  failedReason?: string;
  counts?: Record<string, unknown>;
  workerCount?: number;
  oldestWaitingMs?: number;
}

export async function recordIngestEvents(args: {
  sourceId: string;
  events: IngestEventInput[];
}): Promise<{ accepted: number; deduped: number }> {
  const client = createServerConvexClient();
  return await client.mutation(api.ingest.record, args);
}
