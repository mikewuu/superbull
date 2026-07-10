import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('unauthorized');
  }
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

export const record = mutation({
  args: { internalToken: v.string(), sourceId: v.string(), events: v.array(eventArgs) },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      throw new Error('unknown source');
    }
    const source = await ctx.db.get(sourceId);
    if (!source) {
      throw new Error('unknown source');
    }

    let accepted = 0;
    let deduped = 0;
    for (const event of args.events) {
      const existing = await ctx.db
        .query('ingestEvents')
        .withIndex('by_uuid', (q) => q.eq('uuid', event.uuid))
        .unique();
      if (existing) {
        deduped++;
        continue;
      }
      await ctx.db.insert('ingestEvents', { sourceId, ...event });
      accepted++;
    }

    return { accepted, deduped };
  },
});

export const countBySource = query({
  args: { internalToken: v.string(), sourceId: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      return 0;
    }
    const events = await ctx.db
      .query('ingestEvents')
      .withIndex('by_source_ts', (q) => q.eq('sourceId', sourceId))
      .collect();
    return events.length;
  },
});
