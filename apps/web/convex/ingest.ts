import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { requireInternalToken } from './access';
import { upsertErrorGroup } from './errors';

// Raw ingest events are dropped after this window — no rollups, we just lose
// the per-job detail past 7 days. Retention is measured on `_creationTime`
// (when the row landed in Convex), not the connector-supplied `ts`, so clock
// skew on a customer's box can neither keep rows alive nor evict them early.
const INGEST_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Rows deleted per purge transaction. Well under Convex's 16k-writes /
// 16 MiB-per-mutation limit; purgeExpired reschedules itself until drained.
const PURGE_BATCH_SIZE = 4000;

interface NormalizedEvent {
  uuid: string;
  type: string;
  queueName: string;
  jobName?: string;
  jobId?: string;
  ts: number;
  durationMs?: number;
  waitMs?: number;
  failedReason?: string;
  counts?: unknown;
  workerCount?: number;
  oldestWaitingMs?: number;
}

async function insertEvents(
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  connectorId: Id<'connectors'>,
  events: NormalizedEvent[],
): Promise<{ accepted: number; deduped: number }> {
  let accepted = 0;
  let deduped = 0;
  for (const event of events) {
    // .first(), not .unique(): if duplicate rows for one (connectorId, uuid)
    // ever land (e.g. rows inserted before dedupe was connector-scoped), the
    // lookup must keep deduping rather than throw on every later batch.
    const existing = await ctx.db
      .query('ingestEvents')
      .withIndex('by_connector_uuid', (q) =>
        q.eq('connectorId', connectorId).eq('uuid', event.uuid),
      )
      .first();
    if (existing) {
      deduped++;
      continue;
    }
    await ctx.db.insert('ingestEvents', { projectId, connectorId, ...event });
    accepted++;

    if (event.type === 'job.failed' && event.failedReason) {
      await upsertErrorGroup(ctx, {
        projectId,
        connectorId,
        queueName: event.queueName,
        jobName: event.jobName,
        jobId: event.jobId,
        message: event.failedReason,
        ts: event.ts,
      });
    }
  }

  return { accepted, deduped };
}

const protocolEventArgs = v.object({
  uuid: v.string(),
  type: v.string(),
  queue_name: v.string(),
  ts: v.number(),
  job_name: v.optional(v.string()),
  job_id: v.optional(v.string()),
  duration_ms: v.optional(v.union(v.number(), v.null())),
  wait_ms: v.optional(v.union(v.number(), v.null())),
  failed_reason: v.optional(v.string()),
  counts: v.optional(v.any()),
  worker_count: v.optional(v.number()),
  oldest_waiting_ms: v.optional(v.union(v.number(), v.null())),
});

// Gateway -> Convex contract fn (@superbull/protocol IngestEvent[], snake_case
// in, camelCase stored). internalToken-gated: only the always-on gateway
// service holds CONVEX_INTERNAL_TOKEN. This is the sole ingest write path.
export const recordBatch = mutation({
  args: {
    internalToken: v.string(),
    connectorId: v.id('connectors'),
    events: v.array(protocolEventArgs),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      throw new Error('unknown connector');
    }

    const events: NormalizedEvent[] = args.events.map((event) => ({
      uuid: event.uuid,
      type: event.type,
      queueName: event.queue_name,
      jobName: event.job_name,
      jobId: event.job_id,
      ts: event.ts,
      durationMs: event.duration_ms ?? undefined,
      waitMs: event.wait_ms ?? undefined,
      failedReason: event.failed_reason,
      counts: event.counts,
      workerCount: event.worker_count,
      oldestWaitingMs: event.oldest_waiting_ms ?? undefined,
    }));

    return await insertEvents(ctx, connector.projectId, args.connectorId, events);
  },
});

// Deletes one bounded batch of events older than the retention window, then
// reschedules itself when a full batch came back (i.e. more remain) so a single
// trigger drains the whole backlog regardless of the cron interval. Ordered by
// `_creationTime` via the built-in `by_creation_time` index, oldest first.
// internalMutation: reachable only from Convex itself (the cron in crons.ts and
// this self-schedule), never from a client — so no internalToken gate needed.
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - INGEST_RETENTION_MS;
    const expired = await ctx.db
      .query('ingestEvents')
      .withIndex('by_creation_time', (q) => q.lt('_creationTime', cutoff))
      .take(PURGE_BATCH_SIZE);

    for (const doc of expired) {
      await ctx.db.delete(doc._id);
    }

    if (expired.length === PURGE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.ingest.purgeExpired, {});
    }

    return { deleted: expired.length };
  },
});

export const countByConnector = query({
  args: { internalToken: v.string(), connectorId: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const connectorId = ctx.db.normalizeId('connectors', args.connectorId);
    if (!connectorId) {
      return 0;
    }
    const events = await ctx.db
      .query('ingestEvents')
      .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId))
      .collect();
    return events.length;
  },
});
