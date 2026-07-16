import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { requireInternalToken, requireRole, requireWorkspaceMember } from './access';

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

// Oldest workspace by creation order — the transitional home for anything
// arriving through the unauthenticated hub-token API surface (register,
// list/create sources, DELETE by id) that predates workspaces entirely.
// Round 3 deletes /api/sources/register and this codepath along with it.
async function oldestWorkspaceId(ctx: MutationCtx): Promise<Id<'workspaces'>> {
  const workspace = await ctx.db.query('workspaces').order('asc').first();
  if (!workspace) {
    throw new Error('no workspace exists to attach this connector to');
  }
  return workspace._id;
}

// ---------------------------------------------------------------------------
// User-facing (workspace + Convex-auth scoped)
// ---------------------------------------------------------------------------

export const listByWorkspace = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query('connectors')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();
  },
});

export const getById = query({
  args: { workspaceId: v.id('workspaces'), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.workspaceId !== args.workspaceId) {
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
  args: { workspaceId: v.id('workspaces'), name: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    const { member } = await requireWorkspaceMember(ctx, args.workspaceId);
    requireRole(member, ['owner', 'admin', 'member']);
    const name = args.name.trim();
    if (!name) {
      throw new Error('Connector name is required');
    }
    if (!/^[0-9a-f]{64}$/.test(args.tokenHash)) {
      throw new Error('Invalid token hash');
    }

    const id = await ctx.db.insert('connectors', {
      workspaceId: args.workspaceId,
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
  args: { workspaceId: v.id('workspaces'), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    const { member } = await requireWorkspaceMember(ctx, args.workspaceId);
    requireRole(member, ['owner', 'admin']);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.workspaceId !== args.workspaceId) {
      return null;
    }
    await deleteConnectorChildren(ctx, args.connectorId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// TRANSITIONAL — internalToken-gated, unscoped-by-user hub API surface.
// Backs /api/sources, /api/sources/register, /api/sources/[sourceId],
// forwardToProxy lookups, and the MCP tools running under the global
// SUPERBULL_API_TOKEN. Round 3 deletes register/list/create/upsertByName
// once the gateway RPC path + per-workspace API keys land.
// ---------------------------------------------------------------------------

export const list = query({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    return await ctx.db.query('connectors').collect();
  },
});

export const findById = query({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('connectors', args.id);
    if (!id) {
      return null;
    }
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: { internalToken: v.string(), name: v.string(), url: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const workspaceId = await oldestWorkspaceId(ctx);
    const id = await ctx.db.insert('connectors', {
      workspaceId,
      name: args.name,
      url: args.url,
      token: args.token,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to create connector');
    }
    return created;
  },
});

export const upsertByName = mutation({
  args: { internalToken: v.string(), name: v.string(), url: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const workspaceId = await oldestWorkspaceId(ctx);
    const existing = await ctx.db
      .query('connectors')
      .withIndex('by_workspace_name', (q) => q.eq('workspaceId', workspaceId).eq('name', args.name))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { url: args.url, token: args.token });
      const patched = await ctx.db.get(existing._id);
      if (!patched) {
        throw new Error('failed to upsert connector');
      }
      return patched;
    }

    const id = await ctx.db.insert('connectors', {
      workspaceId,
      name: args.name,
      url: args.url,
      token: args.token,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to upsert connector');
    }
    return created;
  },
});

export const remove = mutation({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('connectors', args.id);
    if (!id) {
      return null;
    }
    await deleteConnectorChildren(ctx, id);
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
    return { connectorId: connector._id, workspaceId: connector.workspaceId, name: connector.name };
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
