import { timingSafeEqual } from 'node:crypto';
import { buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findConnectorByIdLegacy } from '../../../lib/connectors/find-connector-by-id-legacy';
import type { IngestEventInput } from '../../../lib/ingest/record-ingest-events';
import { recordIngestEvents } from '../../../lib/ingest/record-ingest-events';

const eventSchema = z.object({
  uuid: z.string(),
  type: z.string(),
  queue_name: z.string(),
  ts: z.number(),
  job_name: z.string().optional(),
  job_id: z.union([z.string(), z.number()]).optional(),
  duration_ms: z.number().nullable().optional(),
  wait_ms: z.number().nullable().optional(),
  failed_reason: z.string().optional(),
  counts: z.record(z.string(), z.unknown()).optional(),
  worker_count: z.number().optional(),
  oldest_waiting_ms: z.number().nullable().optional(),
});

const bodySchema = z.object({
  source_id: z.string(),
  events: z.array(eventSchema).max(500),
});

// TRANSITIONAL — the old HTTP proxy flow (connector's plaintext `token`
// field). Round 3 replaces this with the gateway calling
// ingest.recordBatch directly over the WS connection.
async function authenticateConnectorToken<
  TReq extends { headers: Headers; body: { source_id: string } },
>(req: TReq): Promise<TReq | NextResponse> {
  const connector = await findConnectorByIdLegacy(req.body.source_id);
  if (!connector || !connector.token) {
    return NextResponse.json({ error: 'unknown source' }, { status: 401 });
  }

  const header = req.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const authorized =
    presented.length === connector.token.length &&
    timingSafeEqual(Buffer.from(presented), Buffer.from(connector.token));

  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return req;
}

export const POST = buildRoute({
  body: bodySchema,
  response: z.object({ accepted: z.number(), deduped: z.number() }),
})
  .use(authenticateConnectorToken)
  .handle(async (req) => {
    const events: IngestEventInput[] = req.body.events.map((event) => ({
      uuid: event.uuid,
      type: event.type,
      queueName: event.queue_name,
      jobName: event.job_name,
      jobId: event.job_id === undefined ? undefined : String(event.job_id),
      ts: event.ts,
      durationMs: event.duration_ms ?? undefined,
      waitMs: event.wait_ms ?? undefined,
      failedReason: event.failed_reason,
      counts: event.counts,
      workerCount: event.worker_count,
      oldestWaitingMs: event.oldest_waiting_ms ?? undefined,
    }));

    const result = await recordIngestEvents({ connectorId: req.body.source_id, events });
    return NextResponse.json(result);
  });
