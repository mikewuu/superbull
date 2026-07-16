import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireWorkspaceMember } from './access';

const cardValidator = v.object({
  type: v.union(
    v.literal('throughput'),
    v.literal('latency'),
    v.literal('totals'),
    v.literal('heatmap'),
  ),
  connector_id: v.string(),
  queue_name: v.optional(v.string()),
  range: v.union(v.literal('24h'), v.literal('7d'), v.literal('30d')),
});

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query('savedDashboards')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();
  },
});

export const findById = query({
  args: { workspaceId: v.id('workspaces'), id: v.id('savedDashboards') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const dashboard = await ctx.db.get(args.id);
    if (!dashboard || dashboard.workspaceId !== args.workspaceId) {
      return null;
    }
    return dashboard;
  },
});

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), name: v.string(), cards: v.array(cardValidator) },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const id = await ctx.db.insert('savedDashboards', {
      workspaceId: args.workspaceId,
      name: args.name,
      cards: args.cards,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to create dashboard');
    }
    return created;
  },
});

export const update = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    id: v.id('savedDashboards'),
    name: v.optional(v.string()),
    cards: v.optional(v.array(cardValidator)),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.workspaceId !== args.workspaceId) {
      throw new Error('unknown dashboard');
    }
    if (args.name !== undefined) {
      await ctx.db.patch(args.id, { name: args.name });
    }
    if (args.cards !== undefined) {
      await ctx.db.patch(args.id, { cards: args.cards });
    }
    const updated = await ctx.db.get(args.id);
    if (!updated) {
      throw new Error('failed to update dashboard');
    }
    return updated;
  },
});

export const remove = mutation({
  args: { workspaceId: v.id('workspaces'), id: v.id('savedDashboards') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.workspaceId !== args.workspaceId) {
      return null;
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
