import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

const alertRuleType = v.union(
  v.literal('failed_threshold'),
  v.literal('stuck_queue'),
  v.literal('worker_loss'),
  v.literal('new_error_group'),
);

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('unauthorized');
  }
}

function guardRuleFields(rule: {
  type: 'failed_threshold' | 'stuck_queue' | 'worker_loss' | 'new_error_group';
  queueName?: string;
  threshold?: number;
  windowMinutes?: number;
}): void {
  if (!rule.windowMinutes || rule.windowMinutes <= 0) {
    throw new Error('windowMinutes must be a positive number');
  }
  if (rule.type === 'failed_threshold' && (!rule.threshold || rule.threshold <= 0)) {
    throw new Error('threshold must be a positive number for failed_threshold rules');
  }
  if ((rule.type === 'stuck_queue' || rule.type === 'worker_loss') && !rule.queueName) {
    throw new Error('queueName is required for stuck_queue and worker_loss rules');
  }
}

export const list = query({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    return await ctx.db.query('alertRules').collect();
  },
});

export const listStates = query({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    return await ctx.db.query('alertStates').collect();
  },
});

export const create = mutation({
  args: {
    internalToken: v.string(),
    sourceId: v.optional(v.string()),
    type: alertRuleType,
    queueName: v.optional(v.string()),
    threshold: v.optional(v.number()),
    windowMinutes: v.optional(v.number()),
    email: v.string(),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    guardRuleFields(args);
    const sourceId = args.sourceId ? normalizeSourceId(ctx, args.sourceId) : undefined;

    const id = await ctx.db.insert('alertRules', {
      sourceId,
      type: args.type,
      queueName: args.queueName,
      threshold: args.threshold,
      windowMinutes: args.windowMinutes,
      email: args.email,
      isEnabled: args.isEnabled,
    });
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to create alert rule');
    }
    return created;
  },
});

export const update = mutation({
  args: {
    internalToken: v.string(),
    id: v.string(),
    sourceId: v.optional(v.string()),
    type: v.optional(alertRuleType),
    queueName: v.optional(v.string()),
    threshold: v.optional(v.number()),
    windowMinutes: v.optional(v.number()),
    email: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('alertRules', args.id);
    if (!id) {
      throw new Error('unknown alert rule');
    }
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('unknown alert rule');
    }

    const type = args.type ?? existing.type;
    const queueName = args.queueName !== undefined ? args.queueName : existing.queueName;
    const threshold = args.threshold !== undefined ? args.threshold : existing.threshold;
    const windowMinutes =
      args.windowMinutes !== undefined ? args.windowMinutes : existing.windowMinutes;
    guardRuleFields({ type, queueName, threshold, windowMinutes });

    await ctx.db.patch(id, {
      sourceId:
        args.sourceId !== undefined ? normalizeSourceId(ctx, args.sourceId) : existing.sourceId,
      type,
      queueName,
      threshold,
      windowMinutes,
      email: args.email ?? existing.email,
      isEnabled: args.isEnabled ?? existing.isEnabled,
    });
    const updated = await ctx.db.get(id);
    if (!updated) {
      throw new Error('failed to update alert rule');
    }
    return updated;
  },
});

export const remove = mutation({
  args: { internalToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const id = ctx.db.normalizeId('alertRules', args.id);
    if (!id) {
      return null;
    }
    const states = await ctx.db
      .query('alertStates')
      .withIndex('by_rule', (q) => q.eq('ruleId', id))
      .collect();
    for (const state of states) {
      await ctx.db.delete(state._id);
    }
    await ctx.db.delete(id);
    return null;
  },
});

interface NotifyEntry {
  rule_id: Id<'alertRules'>;
  email: string;
  type: Doc<'alertRules'>['type'];
  queue_name: string | null;
  summary: string;
  kind: 'firing' | 'resolved';
}

export const evaluate = mutation({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const rules = await ctx.db
      .query('alertRules')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect();

    const toNotify: NotifyEntry[] = [];
    for (const rule of rules) {
      const entry = await evaluateRule(ctx, rule);
      if (entry) {
        toNotify.push(entry);
      }
    }
    return { evaluated: rules.length, to_notify: toNotify };
  },
});

export const digestSummary = query({
  args: { internalToken: v.string(), sinceTs: v.number() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sources = await ctx.db.query('proxySources').collect();
    const perSource = [];
    for (const source of sources) {
      const events = await ctx.db
        .query('ingestEvents')
        .withIndex('by_source_ts', (q) => q.eq('sourceId', source._id).gte('ts', args.sinceTs))
        .collect();
      const errorGroups = await ctx.db
        .query('errorGroups')
        .withIndex('by_source_last_seen', (q) =>
          q.eq('sourceId', source._id).gte('lastSeenTs', args.sinceTs),
        )
        .collect();
      const topErrorGroups = errorGroups
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((group) => ({
          message: group.message,
          queueName: group.queueName,
          count: group.count,
        }));

      perSource.push({
        sourceId: source._id,
        sourceName: source.name,
        completed: events.filter((event) => event.type === 'job.completed').length,
        failed: events.filter((event) => event.type === 'job.failed').length,
        topErrorGroups,
      });
    }
    return { perSource };
  },
});

async function evaluateRule(
  ctx: MutationCtx,
  rule: Doc<'alertRules'>,
): Promise<NotifyEntry | null> {
  const windowStart = Date.now() - (rule.windowMinutes ?? 5) * 60_000;
  const { firing, summary } = await computeRuleStatus(ctx, rule, windowStart);
  const state = await ctx.db
    .query('alertStates')
    .withIndex('by_rule', (q) => q.eq('ruleId', rule._id))
    .unique();

  if (firing) {
    if (state?.state === 'firing') {
      return null;
    }
    const now = Date.now();
    if (state) {
      await ctx.db.patch(state._id, { state: 'firing', lastFiredTs: now, lastNotifiedTs: now });
    } else {
      await ctx.db.insert('alertStates', {
        ruleId: rule._id,
        state: 'firing',
        lastFiredTs: now,
        lastNotifiedTs: now,
      });
    }
    return {
      rule_id: rule._id,
      email: rule.email,
      type: rule.type,
      queue_name: rule.queueName ?? null,
      summary,
      kind: 'firing',
    };
  }

  if (state?.state === 'firing') {
    await ctx.db.patch(state._id, { state: 'resolved', lastNotifiedTs: Date.now() });
    return {
      rule_id: rule._id,
      email: rule.email,
      type: rule.type,
      queue_name: rule.queueName ?? null,
      summary,
      kind: 'resolved',
    };
  }

  return null;
}

async function computeRuleStatus(
  ctx: MutationCtx,
  rule: Doc<'alertRules'>,
  windowStart: number,
): Promise<{ firing: boolean; summary: string }> {
  switch (rule.type) {
    case 'failed_threshold':
      return await computeFailedThresholdStatus(ctx, rule, windowStart);
    case 'stuck_queue':
      return await computeStuckQueueStatus(ctx, rule, windowStart);
    case 'worker_loss':
      return await computeWorkerLossStatus(ctx, rule, windowStart);
    case 'new_error_group':
      return await computeNewErrorGroupStatus(ctx, rule, windowStart);
    default:
      return { firing: false, summary: '' };
  }
}

async function computeFailedThresholdStatus(
  ctx: MutationCtx,
  rule: Doc<'alertRules'>,
  windowStart: number,
): Promise<{ firing: boolean; summary: string }> {
  const sourceIds = await getRuleSourceIds(ctx, rule);
  let count = 0;
  for (const sourceId of sourceIds) {
    const events = await queryEventsInWindow(ctx, sourceId, rule.queueName, windowStart);
    count += events.filter((event) => event.type === 'job.failed').length;
  }
  const threshold = rule.threshold ?? 0;
  const scope = rule.queueName ? `queue "${rule.queueName}"` : 'all queues';
  return {
    firing: count >= threshold,
    summary: `${count} failed jobs in ${scope} over the last ${rule.windowMinutes}m (threshold ${threshold})`,
  };
}

async function computeStuckQueueStatus(
  ctx: MutationCtx,
  rule: Doc<'alertRules'>,
  windowStart: number,
): Promise<{ firing: boolean; summary: string }> {
  const sourceIds = await getRuleSourceIds(ctx, rule);
  for (const sourceId of sourceIds) {
    const events = await queryEventsInWindow(ctx, sourceId, rule.queueName, windowStart);
    const completedByQueue = countEventsByQueue(events, 'job.completed');
    for (const snapshot of latestSnapshotsByQueue(events)) {
      const counts = snapshot.counts as Record<string, number> | undefined;
      const waiting = (counts?.waiting ?? 0) + (counts?.prioritized ?? 0);
      const completed = completedByQueue.get(snapshot.queueName) ?? 0;
      if (waiting > 0 && completed === 0) {
        return {
          firing: true,
          summary: `Queue "${snapshot.queueName}" has ${waiting} jobs waiting with zero completions in the last ${rule.windowMinutes}m`,
        };
      }
    }
  }
  return { firing: false, summary: `Queue "${rule.queueName}" is draining normally` };
}

async function computeWorkerLossStatus(
  ctx: MutationCtx,
  rule: Doc<'alertRules'>,
  windowStart: number,
): Promise<{ firing: boolean; summary: string }> {
  const sourceIds = await getRuleSourceIds(ctx, rule);
  for (const sourceId of sourceIds) {
    const events = await queryEventsInWindow(ctx, sourceId, rule.queueName, windowStart);
    for (const snapshot of latestSnapshotsByQueue(events)) {
      if (snapshot.workerCount === 0) {
        return {
          firing: true,
          summary: `No active workers detected for queue "${snapshot.queueName}"`,
        };
      }
    }
  }
  return { firing: false, summary: `Queue "${rule.queueName}" has active workers` };
}

async function computeNewErrorGroupStatus(
  ctx: MutationCtx,
  rule: Doc<'alertRules'>,
  windowStart: number,
): Promise<{ firing: boolean; summary: string }> {
  const sourceIds = await getRuleSourceIds(ctx, rule);
  let newCount = 0;
  for (const sourceId of sourceIds) {
    const groups = await ctx.db
      .query('errorGroups')
      .withIndex('by_source_last_seen', (q) =>
        q.eq('sourceId', sourceId).gte('lastSeenTs', windowStart),
      )
      .collect();
    newCount += groups.filter((group) => group.firstSeenTs >= windowStart).length;
  }
  return {
    firing: newCount > 0,
    summary: `${newCount} new error group${newCount === 1 ? '' : 's'} in the last ${rule.windowMinutes}m`,
  };
}

async function getRuleSourceIds(
  ctx: MutationCtx,
  rule: Doc<'alertRules'>,
): Promise<Id<'proxySources'>[]> {
  if (rule.sourceId) {
    return [rule.sourceId];
  }
  const sources = await ctx.db.query('proxySources').collect();
  return sources.map((source) => source._id);
}

async function queryEventsInWindow(
  ctx: MutationCtx,
  sourceId: Id<'proxySources'>,
  queueName: string | undefined,
  windowStart: number,
): Promise<Doc<'ingestEvents'>[]> {
  if (queueName) {
    return await ctx.db
      .query('ingestEvents')
      .withIndex('by_source_queue_ts', (q) =>
        q.eq('sourceId', sourceId).eq('queueName', queueName).gte('ts', windowStart),
      )
      .collect();
  }
  return await ctx.db
    .query('ingestEvents')
    .withIndex('by_source_ts', (q) => q.eq('sourceId', sourceId).gte('ts', windowStart))
    .collect();
}

function latestSnapshotsByQueue(events: Doc<'ingestEvents'>[]): Doc<'ingestEvents'>[] {
  const latestByQueue = new Map<string, Doc<'ingestEvents'>>();
  for (const event of events) {
    if (event.type !== 'queue.snapshot') {
      continue;
    }
    const current = latestByQueue.get(event.queueName);
    if (!current || event.ts > current.ts) {
      latestByQueue.set(event.queueName, event);
    }
  }
  return [...latestByQueue.values()];
}

function countEventsByQueue(events: Doc<'ingestEvents'>[], type: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== type) {
      continue;
    }
    counts.set(event.queueName, (counts.get(event.queueName) ?? 0) + 1);
  }
  return counts;
}

function normalizeSourceId(ctx: QueryCtx, sourceId: string): Id<'proxySources'> {
  const normalized = ctx.db.normalizeId('proxySources', sourceId);
  if (!normalized) {
    throw new Error('unknown source');
  }
  return normalized;
}
