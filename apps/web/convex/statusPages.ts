import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { type QueryCtx, mutation, query } from './_generated/server';
import { requireWorkspaceMember } from './access';

const dayMs = 86_400_000;
const maxEventsPerQuery = 20_000;

function dayStart(ts: number): number {
  return Math.floor(ts / dayMs) * dayMs;
}

function toDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function rateOrNull(completed: number, failed: number): number | null {
  const total = completed + failed;
  return total === 0 ? null : completed / total;
}

function bucketEventsByDay(
  events: Array<{ type: string; ts: number }>,
  cutoffTs: number,
  todayStart: number,
): { days: Array<{ date: string; rate: number | null; total: number }>; rate90d: number | null } {
  const counts = new Map<number, { completed: number; failed: number }>();
  for (let ts = cutoffTs; ts <= todayStart; ts += dayMs) {
    counts.set(ts, { completed: 0, failed: 0 });
  }
  for (const event of events) {
    const bucket = counts.get(dayStart(event.ts));
    if (!bucket) {
      continue;
    }
    if (event.type === 'job.completed') {
      bucket.completed++;
    } else if (event.type === 'job.failed') {
      bucket.failed++;
    }
  }

  const days = Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, { completed, failed }]) => ({
      date: toDateKey(ts),
      rate: rateOrNull(completed, failed),
      total: completed + failed,
    }));

  const totals = Array.from(counts.values()).reduce(
    (acc, { completed, failed }) => ({
      completed: acc.completed + completed,
      failed: acc.failed + failed,
    }),
    { completed: 0, failed: 0 },
  );

  return { days, rate90d: rateOrNull(totals.completed, totals.failed) };
}

async function bucketConnectorEvents(
  ctx: QueryCtx,
  connectorId: Id<'connectors'>,
  cutoffTs: number,
  todayStart: number,
) {
  const events = await ctx.db
    .query('ingestEvents')
    .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId).gte('ts', cutoffTs))
    .take(maxEventsPerQuery);
  return bucketEventsByDay(events, cutoffTs, todayStart);
}

async function bucketQueueEvents(
  ctx: QueryCtx,
  connectorId: Id<'connectors'>,
  queueName: string,
  cutoffTs: number,
) {
  const events = await ctx.db
    .query('ingestEvents')
    .withIndex('by_connector_queue_ts', (q) =>
      q.eq('connectorId', connectorId).eq('queueName', queueName).gte('ts', cutoffTs),
    )
    .take(maxEventsPerQuery);
  return { name: queueName, events };
}

export const getByConnector = query({
  args: { workspaceId: v.id('workspaces'), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const config = await ctx.db
      .query('statusPageConfigs')
      .withIndex('by_connector', (q) => q.eq('connectorId', args.connectorId))
      .unique();
    if (!config || config.workspaceId !== args.workspaceId) {
      return null;
    }
    return config;
  },
});

export const upsert = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    connectorId: v.id('connectors'),
    slug: v.string(),
    isEnabled: v.boolean(),
    title: v.string(),
    queueNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    if (!/^[a-z0-9-]{3,50}$/.test(args.slug)) {
      throw new Error('invalid slug');
    }
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.workspaceId !== args.workspaceId) {
      throw new Error('unknown connector');
    }

    const bySlug = await ctx.db
      .query('statusPageConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (bySlug && bySlug.connectorId !== args.connectorId) {
      throw new Error('slug already taken');
    }

    const existing =
      bySlug ??
      (await ctx.db
        .query('statusPageConfigs')
        .withIndex('by_connector', (q) => q.eq('connectorId', args.connectorId))
        .unique());

    const fields = {
      workspaceId: args.workspaceId,
      connectorId: args.connectorId,
      slug: args.slug,
      isEnabled: args.isEnabled,
      title: args.title,
      queueNames: args.queueNames,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      const patched = await ctx.db.get(existing._id);
      if (!patched) {
        throw new Error('failed to upsert status page config');
      }
      return patched;
    }

    const id = await ctx.db.insert('statusPageConfigs', fields);
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error('failed to upsert status page config');
    }
    return created;
  },
});

export const setLogo = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    configId: v.id('statusPageConfigs'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const config = await ctx.db.get(args.configId);
    if (!config || config.workspaceId !== args.workspaceId) {
      throw new Error('unknown status page config');
    }

    await ctx.db.patch(args.configId, { logoStorageId: args.storageId });
    const patched = await ctx.db.get(args.configId);
    if (!patched) {
      throw new Error('failed to set logo');
    }
    return patched;
  },
});

export const generateLogoUploadUrl = mutation({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.storage.generateUploadUrl();
  },
});

// ---------------------------------------------------------------------------
// Public — unauthenticated by design. Recipient-facing status pages must
// stay reachable with no Convex Auth session; workspaceId is stored on the
// config but never required by these two queries, so the public interface
// is unchanged from before workspaces existed.
// ---------------------------------------------------------------------------

export const getPublicPage = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query('statusPageConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!config || !config.isEnabled) {
      return null;
    }
    const logoUrl = config.logoStorageId ? await ctx.storage.getUrl(config.logoStorageId) : null;
    return { title: config.title, logo_url: logoUrl, queues: config.queueNames ?? [] };
  },
});

export const getPublicUptime = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query('statusPageConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!config || !config.isEnabled) {
      return null;
    }

    const todayStart = dayStart(Date.now());
    const cutoffTs = todayStart - 89 * dayMs;
    const queueNames = config.queueNames ?? [];

    if (queueNames.length === 0) {
      const { days, rate90d } = await bucketConnectorEvents(
        ctx,
        config.connectorId,
        cutoffTs,
        todayStart,
      );
      return { overall_rate_90d: rate90d, overall: days, queues: [] };
    }

    const perQueue = await Promise.all(
      queueNames.map((name) => bucketQueueEvents(ctx, config.connectorId, name, cutoffTs)),
    );
    const queues = perQueue.map(({ name, events }) => {
      const { days, rate90d } = bucketEventsByDay(events, cutoffTs, todayStart);
      return { name, rate_90d: rate90d, days };
    });

    const allEvents = perQueue.flatMap(({ events }) => events);
    const { days, rate90d } = bucketEventsByDay(allEvents, cutoffTs, todayStart);
    return { overall_rate_90d: rate90d, overall: days, queues };
  },
});
