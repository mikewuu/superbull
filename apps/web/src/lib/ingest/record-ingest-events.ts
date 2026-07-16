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

// TRANSITIONAL — backs /api/ingest (the old HTTP proxy flow, authenticated
// by the connector's plaintext token). Round 3 replaces this with the
// gateway calling ingest.recordBatch directly.
export async function recordIngestEvents(args: {
  connectorId: string;
  events: IngestEventInput[];
}): Promise<{ accepted: number; deduped: number }> {
  const client = createServerConvexClient();
  return await client.mutation(api.ingest.record, args);
}
