import { getAuthUserId } from '@convex-dev/auth/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export function hasValidInternalToken(internalToken?: string): boolean {
  const expected = process.env.CONVEX_INTERNAL_TOKEN;
  if (!expected || !internalToken || expected.length !== internalToken.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ internalToken.charCodeAt(index);
  }
  return difference === 0;
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
// project membership is never leaked by the error shape.
export async function requireProjectMember(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>,
): Promise<{
  userId: Id<'users'>;
  user: Doc<'users'>;
  member: Doc<'members'>;
  project: Doc<'projects'>;
}> {
  const { userId, user } = await requireUser(ctx);
  const member = await ctx.db
    .query('members')
    .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
    .first();

  if (!member) {
    throw new Error('Project not found');
  }

  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  return { userId, user, member, project };
}

export async function requireProjectMemberBySlug(
  ctx: QueryCtx | MutationCtx,
  slug: string,
): Promise<{
  userId: Id<'users'>;
  user: Doc<'users'>;
  member: Doc<'members'>;
  project: Doc<'projects'>;
}> {
  const { userId, user } = await requireUser(ctx);
  const project = await ctx.db
    .query('projects')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .first();

  if (!project) {
    throw new Error('Project not found');
  }

  const member = await ctx.db
    .query('members')
    .withIndex('by_project_user', (q) => q.eq('projectId', project._id).eq('userId', userId))
    .first();

  if (!member) {
    throw new Error('Project not found');
  }

  return { userId, user, member, project };
}

export function requireRole(member: Doc<'members'>, roles: Array<Doc<'members'>['role']>): void {
  if (!roles.includes(member.role)) {
    throw new Error('Forbidden');
  }
}

// Resolves a connector's project and checks the caller is a member of it.
// Every connector-scoped query/mutation that takes a raw connectorId string
// (as opposed to a validated v.id('connectors')) should route through this
// so a client can never point a connectorId at a project it doesn't belong
// to and read another tenant's data.
export async function requireConnectorMember(
  ctx: QueryCtx | MutationCtx,
  connectorId: Id<'connectors'>,
): Promise<{
  userId: Id<'users'>;
  user: Doc<'users'>;
  member: Doc<'members'>;
  project: Doc<'projects'>;
  connector: Doc<'connectors'>;
}> {
  const connector = await ctx.db.get(connectorId);
  if (!connector) {
    throw new Error('Connector not found');
  }
  const { userId, user, member, project } = await requireProjectMember(ctx, connector.projectId);
  return { userId, user, member, project, connector };
}

export async function requireConnectorMemberForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  connectorId: Id<'connectors'>,
  requiredProjectId?: Id<'projects'>,
): Promise<{
  userId: Id<'users'>;
  user: Doc<'users'>;
  member: Doc<'members'>;
  project: Doc<'projects'>;
  connector: Doc<'connectors'>;
}> {
  const connector = await ctx.db.get(connectorId);
  if (!connector) {
    throw new Error('Connector not found');
  }
  if (requiredProjectId && connector.projectId !== requiredProjectId) {
    throw new Error('Connector not found');
  }

  const member = await ctx.db
    .query('members')
    .withIndex('by_project_user', (q) =>
      q.eq('projectId', connector.projectId).eq('userId', userId),
    )
    .first();
  const project = await ctx.db.get(connector.projectId);
  const user = await ctx.db.get(userId);
  if (!member || !project || !user) {
    throw new Error('Connector not found');
  }

  return { userId, user, member, project, connector };
}
