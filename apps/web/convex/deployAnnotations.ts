import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireInternalToken, requireProjectMember } from './access';

export const list = query({
  args: {
    internalToken: v.string(),
    connectorId: v.string(),
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const connectorId = ctx.db.normalizeId('connectors', args.connectorId);
    if (!connectorId) {
      return [];
    }

    const { fromTs, toTs } = args;
    if (fromTs !== undefined && toTs !== undefined) {
      return await ctx.db
        .query('deployAnnotations')
        .withIndex('by_connector_ts', (q) =>
          q.eq('connectorId', connectorId).gte('ts', fromTs).lte('ts', toTs),
        )
        .order('desc')
        .collect();
    }
    if (fromTs !== undefined) {
      return await ctx.db
        .query('deployAnnotations')
        .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId).gte('ts', fromTs))
        .order('desc')
        .collect();
    }
    if (toTs !== undefined) {
      return await ctx.db
        .query('deployAnnotations')
        .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId).lte('ts', toTs))
        .order('desc')
        .collect();
    }

    return await ctx.db
      .query('deployAnnotations')
      .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId))
      .order('desc')
      .collect();
  },
});

export const create = mutation({
  args: { internalToken: v.string(), connectorId: v.string(), label: v.string(), ts: v.number() },
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

    const id = await ctx.db.insert('deployAnnotations', {
      projectId: connector.projectId,
      connectorId,
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

// User-facing (dashboard) listing, project-scoped.
export const listByProject = query({
  args: { projectId: v.id('projects'), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.projectId !== args.projectId) {
      return [];
    }
    return await ctx.db
      .query('deployAnnotations')
      .withIndex('by_connector_ts', (q) => q.eq('connectorId', args.connectorId))
      .order('desc')
      .collect();
  },
});

export const remove = mutation({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('deployAnnotations', args.id);
    if (!id) {
      return null;
    }
    await ctx.db.delete(id);
    return null;
  },
});
