import { getAuthUserId } from '@convex-dev/auth/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export function hasValidInternalToken(internalToken?: string): boolean {
  const expected = process.env.CONVEX_INTERNAL_TOKEN;
  return Boolean(expected && internalToken && internalToken === expected);
}

// Guard for the internalToken-gated functions the gateway / Next server call
// (never reachable from a browser with a real user session).
export function requireInternalToken(internalToken: string): void {
  if (!hasValidInternalToken(internalToken)) {
    throw new Error('unauthorized');
  }
}

export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Unauthenticated');
  }
  return userId;
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<{ userId: Id<'users'>; user: Doc<'users'> }> {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error('Unauthenticated');
  }
  return { userId, user };
}

// 404-not-403: a non-member gets the same "not found" as a bad id, so
// workspace membership is never leaked by the error shape.
export async function requireWorkspaceMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<'workspaces'>,
): Promise<{
  userId: Id<'users'>;
  user: Doc<'users'>;
  member: Doc<'members'>;
  workspace: Doc<'workspaces'>;
}> {
  const { userId, user } = await requireUser(ctx);
  const member = await ctx.db
    .query('members')
    .withIndex('by_workspace_user', (q) => q.eq('workspaceId', workspaceId).eq('userId', userId))
    .first();

  if (!member) {
    throw new Error('Workspace not found');
  }

  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  return { userId, user, member, workspace };
}

export async function requireWorkspaceMemberBySlug(
  ctx: QueryCtx | MutationCtx,
  slug: string,
): Promise<{
  userId: Id<'users'>;
  user: Doc<'users'>;
  member: Doc<'members'>;
  workspace: Doc<'workspaces'>;
}> {
  const { userId, user } = await requireUser(ctx);
  const workspace = await ctx.db
    .query('workspaces')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .first();

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const member = await ctx.db
    .query('members')
    .withIndex('by_workspace_user', (q) => q.eq('workspaceId', workspace._id).eq('userId', userId))
    .first();

  if (!member) {
    throw new Error('Workspace not found');
  }

  return { userId, user, member, workspace };
}

export function requireRole(member: Doc<'members'>, roles: Array<Doc<'members'>['role']>): void {
  if (!roles.includes(member.role)) {
    throw new Error('Forbidden');
  }
}

// Resolves a connector's workspace and checks the caller is a member of it.
// Every connector-scoped query/mutation that takes a raw connectorId string
// (as opposed to a validated v.id('connectors')) should route through this
// so a client can never point a connectorId at a workspace it doesn't belong
// to and read another tenant's data.
export async function requireConnectorMember(
  ctx: QueryCtx | MutationCtx,
  connectorId: Id<'connectors'>,
): Promise<{
  userId: Id<'users'>;
  user: Doc<'users'>;
  member: Doc<'members'>;
  workspace: Doc<'workspaces'>;
  connector: Doc<'connectors'>;
}> {
  const connector = await ctx.db.get(connectorId);
  if (!connector) {
    throw new Error('Connector not found');
  }
  const { userId, user, member, workspace } = await requireWorkspaceMember(
    ctx,
    connector.workspaceId,
  );
  return { userId, user, member, workspace, connector };
}
