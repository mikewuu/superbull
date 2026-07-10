import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('unauthorized');
  }
}

const cardValidator = v.object({
  type: v.union(
    v.literal('throughput'),
    v.literal('latency'),
    v.literal('totals'),
    v.literal('heatmap'),
  ),
  source_id: v.string(),
  queue_name: v.optional(v.string()),
  range: v.union(v.literal('24h'), v.literal('7d'), v.literal('30d')),
});

export const list = query({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    return await ctx.db.query('savedDashboards').collect();
  },
});

export const findById = query({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('savedDashboards', args.id);
    if (!id) {
      return null;
    }
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: { internalToken: v.string(), name: v.string(), cards: v.array(cardValidator) },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = await ctx.db.insert('savedDashboards', { name: args.name, cards: args.cards });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to create dashboard');
    }
    return created;
  },
});

export const update = mutation({
  args: {
    internalToken: v.string(),
    id: v.string(),
    name: v.optional(v.string()),
    cards: v.optional(v.array(cardValidator)),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('savedDashboards', args.id);
    if (!id) {
      throw new Error('unknown dashboard');
    }
    if (args.name !== undefined) {
      await ctx.db.patch(id, { name: args.name });
    }
    if (args.cards !== undefined) {
      await ctx.db.patch(id, { cards: args.cards });
    }
    const updated = await ctx.db.get(id);
    if (!updated) {
      throw new Error('failed to update dashboard');
    }
    return updated;
  },
});

export const remove = mutation({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('savedDashboards', args.id);
    if (!id) {
      return null;
    }
    await ctx.db.delete(id);
    return null;
  },
});
