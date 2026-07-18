import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireProjectMember } from './access';

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
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    return await ctx.db
      .query('savedDashboards')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const findById = query({
  args: { projectId: v.id('projects'), id: v.id('savedDashboards') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const dashboard = await ctx.db.get(args.id);
    if (!dashboard || dashboard.projectId !== args.projectId) {
      return null;
    }
    return dashboard;
  },
});

export const create = mutation({
  args: { projectId: v.id('projects'), name: v.string(), cards: v.array(cardValidator) },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const id = await ctx.db.insert('savedDashboards', {
      projectId: args.projectId,
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
    projectId: v.id('projects'),
    id: v.id('savedDashboards'),
    name: v.optional(v.string()),
    cards: v.optional(v.array(cardValidator)),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.projectId !== args.projectId) {
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
  args: { projectId: v.id('projects'), id: v.id('savedDashboards') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.projectId !== args.projectId) {
      return null;
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
