import { mutationGeneric as mutation, queryGeneric as query } from 'convex/server';
import { v } from 'convex/values';

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('Invalid internal token');
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
  args: { internalToken: v.string(), id: v.id('proxySources') },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    return await ctx.db.get(args.id);
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
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { internalToken: v.string(), id: v.id('proxySources') },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    await ctx.db.delete(args.id);
  },
});
