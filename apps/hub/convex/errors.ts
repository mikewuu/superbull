import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('unauthorized');
  }
}

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
    sourceId: Id<'proxySources'>;
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
    .withIndex('by_source_fingerprint', (q) =>
      q.eq('sourceId', args.sourceId).eq('fingerprint', fingerprint),
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
    sourceId: args.sourceId,
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

export const recordFailure = mutation({
  args: {
    internalToken: v.string(),
    sourceId: v.string(),
    queueName: v.string(),
    jobName: v.optional(v.string()),
    jobId: v.optional(v.string()),
    message: v.string(),
    ts: v.number(),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      throw new Error('unknown source');
    }
    const source = await ctx.db.get(sourceId);
    if (!source) {
      throw new Error('unknown source');
    }

    await upsertErrorGroup(ctx, {
      sourceId,
      queueName: args.queueName,
      jobName: args.jobName,
      jobId: args.jobId,
      message: args.message,
      ts: args.ts,
    });
  },
});

export const listGroups = query({
  args: {
    internalToken: v.string(),
    sourceId: v.string(),
    state: v.optional(v.union(v.literal('open'), v.literal('resolved'), v.literal('ignored'))),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      return [];
    }

    const { state } = args;
    if (state) {
      return await ctx.db
        .query('errorGroups')
        .withIndex('by_source_state', (q) => q.eq('sourceId', sourceId).eq('state', state))
        .order('desc')
        .take(200);
    }

    return await ctx.db
      .query('errorGroups')
      .withIndex('by_source_last_seen', (q) => q.eq('sourceId', sourceId))
      .order('desc')
      .take(200);
  },
});

export const getGroup = query({
  args: { internalToken: v.string(), groupId: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const groupId = ctx.db.normalizeId('errorGroups', args.groupId);
    if (!groupId) {
      return null;
    }
    return await ctx.db.get(groupId);
  },
});

export const setGroupState = mutation({
  args: {
    internalToken: v.string(),
    groupId: v.string(),
    state: v.union(v.literal('open'), v.literal('resolved'), v.literal('ignored')),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const groupId = ctx.db.normalizeId('errorGroups', args.groupId);
    if (!groupId) {
      throw new Error('unknown group');
    }

    await ctx.db.patch(groupId, {
      state: args.state,
      ...(args.state === 'resolved' ? { isRegression: false } : {}),
    });
    return await ctx.db.get(groupId);
  },
});
