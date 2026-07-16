import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { requireInternalToken } from './access';
import { upsertErrorGroup } from './errors';

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
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
  events: NormalizedEvent[],
): Promise<{ accepted: number; deduped: number }> {
  let accepted = 0;
  let deduped = 0;
  for (const event of events) {
    const existing = await ctx.db
      .query('ingestEvents')
      .withIndex('by_uuid', (q) => q.eq('uuid', event.uuid))
      .unique();
    if (existing) {
      deduped++;
      continue;
    }
    await ctx.db.insert('ingestEvents', { workspaceId, connectorId, ...event });
    accepted++;

    if (event.type === 'job.failed' && event.failedReason) {
      await upsertErrorGroup(ctx, {
        workspaceId,
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

const eventArgs = v.object({
  uuid: v.string(),
  type: v.string(),
  queueName: v.string(),
  jobName: v.optional(v.string()),
  jobId: v.optional(v.string()),
  ts: v.number(),
  durationMs: v.optional(v.number()),
  waitMs: v.optional(v.number()),
  failedReason: v.optional(v.string()),
  counts: v.optional(v.any()),
  workerCount: v.optional(v.number()),
  oldestWaitingMs: v.optional(v.number()),
});

// TRANSITIONAL — internalToken-gated, backs /api/ingest (the old HTTP proxy
// flow, authenticated by the connector's plaintext `token` field). Round 3
// deletes this once the gateway RPC + `recordBatch` path replaces it.
export const record = mutation({
  args: { internalToken: v.string(), connectorId: v.string(), events: v.array(eventArgs) },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const connectorId = ctx.db.normalizeId('connectors', args.connectorId);
    if (!connectorId) {
      throw new Error('unknown connector');
    }
    const connector = await ctx.db.get(connectorId);
    if (!connector) {
      throw new Error('unknown connector');
    }

    return await insertEvents(ctx, connector.workspaceId, connectorId, args.events);
  },
});

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
// in, camelCase stored — mirrors `record` above). internalToken-gated: only
// the always-on gateway service holds CONVEX_INTERNAL_TOKEN. Wired up as the
// live ingest path once forwardToProxy moves to gateway RPC in Round 3.
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

    return await insertEvents(ctx, connector.workspaceId, args.connectorId, events);
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
