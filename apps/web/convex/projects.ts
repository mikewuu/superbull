import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { requireProjectMember, requireRole, requireUser, requireUserId } from './access';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function generateUniqueSlug(ctx: MutationCtx, name: string): Promise<string> {
  const base = slugify(name) || 'project';
  let slug = base;
  let attempt = 1;

  while (
    await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()
  ) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  return slug;
}

export function projectNameForProfile(email?: string | null, name?: string | null): string {
  if (name?.trim()) {
    return `${name.trim()}'s Project`;
  }
  const domain = email?.split('@')[1]?.split('.')[0];
  if (domain) {
    return `${domain.charAt(0).toUpperCase()}${domain.slice(1)}`;
  }
  return 'My Project';
}

export async function createProjectForUser(
  ctx: MutationCtx,
  args: { userId: Id<'users'>; name: string },
): Promise<Id<'projects'>> {
  const slug = await generateUniqueSlug(ctx, args.name);
  const projectId = await ctx.db.insert('projects', {
    name: args.name,
    slug,
    createdAt: Date.now(),
  });
  await ctx.db.insert('members', { projectId, userId: args.userId, role: 'owner' });
  return projectId;
}

export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const name = args.name.trim();
    if (!name) {
      throw new Error('Project name is required');
    }
    const projectId = await createProjectForUser(ctx, { userId, name });
    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new Error('failed to create project');
    }
    return project;
  },
});

export const listProjectsByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const results = [];
    for (const member of memberships) {
      const project = await ctx.db.get(member.projectId);
      if (!project) {
        continue;
      }
      results.push({ project, member });
    }
    return results;
  },
});

// 404-not-403: returns null both when the slug doesn't exist and when the
// caller isn't a member, so the UI can render a single "not found" state.
export const findProjectBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (!project) {
      return null;
    }
    const member = await ctx.db
      .query('members')
      .withIndex('by_project_user', (q) => q.eq('projectId', project._id).eq('userId', userId))
      .first();
    if (!member) {
      return null;
    }
    return { project, member };
  },
});

export const listMembers = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const members = await ctx.db
      .query('members')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const results = [];
    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      results.push({
        _id: member._id,
        userId: member.userId,
        role: member.role,
        email: user?.email ?? null,
        name: user?.name ?? null,
      });
    }
    return results;
  },
});

export const removeMember = mutation({
  args: { projectId: v.id('projects'), memberId: v.id('members') },
  handler: async (ctx, args) => {
    const { member: caller } = await requireProjectMember(ctx, args.projectId);
    requireRole(caller, ['owner', 'admin']);
    const target = await ctx.db.get(args.memberId);
    if (!target || target.projectId !== args.projectId) {
      return null;
    }
    if (target.role === 'owner') {
      throw new Error('Cannot remove the project owner');
    }
    await ctx.db.delete(args.memberId);
    return null;
  },
});

// Cascading delete of every row scoped to this project. Connector children
// (ingestEvents, errorGroups, deployAnnotations, statusPageConfigs) are
// deleted per-connector since they're indexed by connectorId, not
// projectId.
export const deleteProjectAsOwner = mutation({
  args: { projectId: v.id('projects'), name: v.string() },
  handler: async (ctx, args) => {
    const { member, project } = await requireProjectMember(ctx, args.projectId);
    requireRole(member, ['owner']);
    if (args.name.trim() !== project.name) {
      throw new Error('Project name did not match');
    }

    const connectors = await ctx.db
      .query('connectors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    for (const connector of connectors) {
      const [events, errorGroups, annotations, statusPages] = await Promise.all([
        ctx.db
          .query('ingestEvents')
          .withIndex('by_connector_ts', (q) => q.eq('connectorId', connector._id))
          .collect(),
        ctx.db
          .query('errorGroups')
          .withIndex('by_connector_last_seen', (q) => q.eq('connectorId', connector._id))
          .collect(),
        ctx.db
          .query('deployAnnotations')
          .withIndex('by_connector_ts', (q) => q.eq('connectorId', connector._id))
          .collect(),
        ctx.db
          .query('statusPageConfigs')
          .withIndex('by_connector', (q) => q.eq('connectorId', connector._id))
          .collect(),
      ]);
      const children = [...events, ...errorGroups, ...annotations, ...statusPages];
      await Promise.all(children.map((child) => ctx.db.delete(child._id)));
      await ctx.db.delete(connector._id);
    }

    const alertRules = await ctx.db
      .query('alertRules')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const rule of alertRules) {
      const states = await ctx.db
        .query('alertStates')
        .withIndex('by_rule', (q) => q.eq('ruleId', rule._id))
        .collect();
      await Promise.all(states.map((state) => ctx.db.delete(state._id)));
      await ctx.db.delete(rule._id);
    }

    const dashboards = await ctx.db
      .query('savedDashboards')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    await Promise.all(dashboards.map((dashboard) => ctx.db.delete(dashboard._id)));

    const invites = await ctx.db
      .query('invites')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    await Promise.all(invites.map((invite) => ctx.db.delete(invite._id)));

    const members = await ctx.db
      .query('members')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    await Promise.all(members.map((m) => ctx.db.delete(m._id)));

    await ctx.db.delete(args.projectId);
    return null;
  },
});
