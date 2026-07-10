import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('unauthorized');
  }
}

export const list = query({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    return await ctx.db.query('proxySources').collect();
  },
});

export const findById = query({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('proxySources', args.id);
    if (!id) {
      return null;
    }
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: { internalToken: v.string(), name: v.string(), url: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = await ctx.db.insert('proxySources', {
      name: args.name,
      url: args.url,
      token: args.token,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to create proxy source');
    }
    return created;
  },
});

export const upsertByName = mutation({
  args: { internalToken: v.string(), name: v.string(), url: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const existing = await ctx.db
      .query('proxySources')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { url: args.url, token: args.token });
      const patched = await ctx.db.get(existing._id);
      if (!patched) {
        throw new Error('failed to upsert proxy source');
      }
      return patched;
    }

    const id = await ctx.db.insert('proxySources', {
      name: args.name,
      url: args.url,
      token: args.token,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to upsert proxy source');
    }
    return created;
  },
});

export const remove = mutation({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('proxySources', args.id);
    if (!id) {
      return null;
    }
    await ctx.db.delete(id);
    return null;
  },
});
