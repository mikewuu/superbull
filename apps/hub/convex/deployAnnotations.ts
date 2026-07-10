import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('unauthorized');
  }
}

export const list = query({
  args: {
    internalToken: v.string(),
    sourceId: v.string(),
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      return [];
    }

    const { fromTs, toTs } = args;
    if (fromTs !== undefined && toTs !== undefined) {
      return await ctx.db
        .query('deployAnnotations')
        .withIndex('by_source_ts', (q) =>
          q.eq('sourceId', sourceId).gte('ts', fromTs).lte('ts', toTs),
        )
        .order('desc')
        .collect();
    }
    if (fromTs !== undefined) {
      return await ctx.db
        .query('deployAnnotations')
        .withIndex('by_source_ts', (q) => q.eq('sourceId', sourceId).gte('ts', fromTs))
        .order('desc')
        .collect();
    }
    if (toTs !== undefined) {
      return await ctx.db
        .query('deployAnnotations')
        .withIndex('by_source_ts', (q) => q.eq('sourceId', sourceId).lte('ts', toTs))
        .order('desc')
        .collect();
    }

    return await ctx.db
      .query('deployAnnotations')
      .withIndex('by_source_ts', (q) => q.eq('sourceId', sourceId))
      .order('desc')
      .collect();
  },
});

export const create = mutation({
  args: { internalToken: v.string(), sourceId: v.string(), label: v.string(), ts: v.number() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      throw new Error('unknown source');
    }

    const id = await ctx.db.insert('deployAnnotations', {
      sourceId,
      label: args.label,
      ts: args.ts,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to create deploy annotation');
    }
    return created;
  },
});

export const remove = mutation({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('deployAnnotations', args.id);
    if (!id) {
      return null;
    }
    await ctx.db.delete(id);
    return null;
  },
});
