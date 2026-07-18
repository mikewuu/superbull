import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import {
  requireConnectorMemberForUser,
  requireInternalToken,
  requireProjectMember,
  requireRole,
} from './access';

async function deleteConnectorChildren(ctx: MutationCtx, connectorId: Id<'connectors'>) {
  const [events, errorGroups, annotations, statusPages] = await Promise.all([
    ctx.db
      .query('ingestEvents')
      .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId))
      .collect(),
    ctx.db
      .query('errorGroups')
      .withIndex('by_connector_last_seen', (q) => q.eq('connectorId', connectorId))
      .collect(),
    ctx.db
      .query('deployAnnotations')
      .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId))
      .collect(),
    ctx.db
      .query('statusPageConfigs')
      .withIndex('by_connector', (q) => q.eq('connectorId', connectorId))
      .collect(),
  ]);
  const children = [...events, ...errorGroups, ...annotations, ...statusPages];
  await Promise.all(children.map((child) => ctx.db.delete(child._id)));
  await ctx.db.delete(connectorId);
}

// ---------------------------------------------------------------------------
// User-facing (project + Convex-auth scoped)
// ---------------------------------------------------------------------------

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    return await ctx.db
      .query('connectors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const getById = query({
  args: { projectId: v.id('projects'), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.projectId !== args.projectId) {
      return null;
    }
    return connector;
  },
});

// The one-time enrollment flow: `tokenHash` is a sha256 hex digest computed
// server-side (Next server action) from a randomly generated 32-byte token.
// The plaintext token is returned to the caller there and shown once in the
// UI — it never reaches Convex, so this mutation cannot leak it.
export const createConnector = mutation({
  args: { projectId: v.id('projects'), name: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    const { member } = await requireProjectMember(ctx, args.projectId);
    requireRole(member, ['owner', 'admin', 'member']);
    const name = args.name.trim();
    if (!name) {
      throw new Error('Connector name is required');
    }
    if (!/^[0-9a-f]{64}$/.test(args.tokenHash)) {
      throw new Error('Invalid token hash');
    }

    const id = await ctx.db.insert('connectors', {
      projectId: args.projectId,
      name,
      tokenHash: args.tokenHash,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to create connector');
    }
    return created;
  },
});

export const removeConnector = mutation({
  args: { projectId: v.id('projects'), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    const { member } = await requireProjectMember(ctx, args.projectId);
    requireRole(member, ['owner', 'admin']);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.projectId !== args.projectId) {
      return null;
    }
    await deleteConnectorChildren(ctx, args.connectorId);
    return null;
  },
});

export const listConnectorsForUser = query({
  args: {
    internalToken: v.string(),
    userId: v.string(),
    requiredProjectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const userId = ctx.db.normalizeId('users', args.userId);
    if (!userId) {
      throw new Error('User not found');
    }
    if (args.requiredProjectId) {
      const requiredProjectId = ctx.db.normalizeId('projects', args.requiredProjectId);
      if (!requiredProjectId) {
        return [];
      }
      const membership = await ctx.db
        .query('members')
        .withIndex('by_project_user', (q) =>
          q.eq('projectId', requiredProjectId).eq('userId', userId),
        )
        .first();
      if (!membership) {
        return [];
      }
      return await ctx.db
        .query('connectors')
        .withIndex('by_project', (q) => q.eq('projectId', requiredProjectId))
        .collect();
    }
    const memberships = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const connectorsByProject = await Promise.all(
      memberships.map((membership) =>
        ctx.db
          .query('connectors')
          .withIndex('by_project', (q) => q.eq('projectId', membership.projectId))
          .collect(),
      ),
    );
    return connectorsByProject.flat();
  },
});

export const findConnectorByIdForUser = query({
  args: {
    internalToken: v.string(),
    userId: v.string(),
    connectorId: v.string(),
    requiredProjectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const userId = ctx.db.normalizeId('users', args.userId);
    const connectorId = ctx.db.normalizeId('connectors', args.connectorId);
    const requiredProjectId = args.requiredProjectId
      ? ctx.db.normalizeId('projects', args.requiredProjectId)
      : undefined;
    if (!userId || !connectorId || (args.requiredProjectId && !requiredProjectId)) {
      return null;
    }
    try {
      const { connector } = await requireConnectorMemberForUser(
        ctx,
        userId,
        connectorId,
        requiredProjectId ?? undefined,
      );
      return connector;
    } catch (error) {
      if (error instanceof Error && error.message === 'Connector not found') {
        return null;
      }
      throw error;
    }
  },
});

export const removeConnectorForUser = mutation({
  args: {
    internalToken: v.string(),
    userId: v.string(),
    connectorId: v.string(),
    requiredProjectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const userId = ctx.db.normalizeId('users', args.userId);
    const connectorId = ctx.db.normalizeId('connectors', args.connectorId);
    const requiredProjectId = args.requiredProjectId
      ? ctx.db.normalizeId('projects', args.requiredProjectId)
      : undefined;
    if (!userId || !connectorId || (args.requiredProjectId && !requiredProjectId)) {
      throw new Error('Connector not found');
    }
    await requireConnectorMemberForUser(ctx, userId, connectorId, requiredProjectId ?? undefined);
    await deleteConnectorChildren(ctx, connectorId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Gateway -> Convex contract (packages/protocol, wired in Round 3). All
// internalToken-gated: only the always-on gateway service holds
// CONVEX_INTERNAL_TOKEN, never a browser.
// ---------------------------------------------------------------------------

export const findByEnrollmentTokenHash = query({
  args: { internalToken: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const connector = await ctx.db
      .query('connectors')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique();
    if (!connector) {
      return null;
    }
    return { connectorId: connector._id, projectId: connector.projectId, name: connector.name };
  },
});

export const markConnected = mutation({
  args: {
    internalToken: v.string(),
    connectorId: v.id('connectors'),
    version: v.optional(v.string()),
    queues: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      throw new Error('unknown connector');
    }
    await ctx.db.patch(args.connectorId, {
      version: args.version ?? connector.version,
      queues: args.queues ?? connector.queues,
      lastConnectedAt: Date.now(),
    });
    return null;
  },
});

export const markDisconnected = mutation({
  args: { internalToken: v.string(), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      return null;
    }
    await ctx.db.patch(args.connectorId, { lastDisconnectedAt: Date.now() });
    return null;
  },
});

export type ConnectorDoc = Doc<'connectors'>;
