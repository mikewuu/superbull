import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { requireProjectMember } from './access';

function normalizeFingerprintMessage(message: string): string {
  const firstLine = message.split('\n')[0] ?? '';
  const lower = firstLine.toLowerCase();
  const withoutUuids = lower.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
    '#',
  );
  const withoutHex = withoutUuids.replace(/[0-9a-f]{8,}/g, '#');
  const withoutDigits = withoutHex.replace(/\d+/g, '#');
  return withoutDigits.slice(0, 200);
}

function computeFingerprint(message: string, queueName: string): string {
  return `${normalizeFingerprintMessage(message)}:${queueName}`;
}

export async function upsertErrorGroup(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>;
    connectorId: Id<'connectors'>;
    queueName: string;
    jobName?: string;
    jobId?: string;
    message: string;
    ts: number;
  },
): Promise<void> {
  const fingerprint = computeFingerprint(args.message, args.queueName);
  const existing = await ctx.db
    .query('errorGroups')
    .withIndex('by_connector_fingerprint', (q) =>
      q.eq('connectorId', args.connectorId).eq('fingerprint', fingerprint),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      lastSeenTs: args.ts,
      lastJobId: args.jobId,
      ...(existing.state === 'resolved' ? { state: 'open' as const, isRegression: true } : {}),
    });
    return;
  }

  await ctx.db.insert('errorGroups', {
    projectId: args.projectId,
    connectorId: args.connectorId,
    fingerprint,
    queueName: args.queueName,
    jobName: args.jobName,
    message: args.message,
    state: 'open',
    count: 1,
    firstSeenTs: args.ts,
    lastSeenTs: args.ts,
    lastJobId: args.jobId,
    isRegression: false,
  });
}

export const listGroups = query({
  args: {
    projectId: v.id('projects'),
    connectorId: v.id('connectors'),
    state: v.optional(v.union(v.literal('open'), v.literal('resolved'), v.literal('ignored'))),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.projectId !== args.projectId) {
      return [];
    }

    const { state } = args;
    if (state) {
      return await ctx.db
        .query('errorGroups')
        .withIndex('by_connector_state', (q) =>
          q.eq('connectorId', args.connectorId).eq('state', state),
        )
        .order('desc')
        .take(200);
    }

    return await ctx.db
      .query('errorGroups')
      .withIndex('by_connector_last_seen', (q) => q.eq('connectorId', args.connectorId))
      .order('desc')
      .take(200);
  },
});

export const getGroup = query({
  args: { projectId: v.id('projects'), groupId: v.id('errorGroups') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const group = await ctx.db.get(args.groupId);
    if (!group || group.projectId !== args.projectId) {
      return null;
    }
    return group;
  },
});

export const setGroupState = mutation({
  args: {
    projectId: v.id('projects'),
    groupId: v.id('errorGroups'),
    state: v.union(v.literal('open'), v.literal('resolved'), v.literal('ignored')),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const group = await ctx.db.get(args.groupId);
    if (!group || group.projectId !== args.projectId) {
      throw new Error('unknown group');
    }

    await ctx.db.patch(args.groupId, {
      state: args.state,
      ...(args.state === 'resolved' ? { isRegression: false } : {}),
    });
    return await ctx.db.get(args.groupId);
  },
});
