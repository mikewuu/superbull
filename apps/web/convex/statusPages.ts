import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { type QueryCtx, mutation, query } from './_generated/server';
import { requireProjectMember } from './access';

const dayMs = 86_400_000;
const defaultEventsPerQuery = 250;
const maxEventsPerQuery = 500;

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
  eventLimit: number,
) {
  const events = await ctx.db
    .query('ingestEvents')
    .withIndex('by_connector_ts', (q) => q.eq('connectorId', connectorId).gte('ts', cutoffTs))
    .order('desc')
    .take(eventLimit);
  return bucketEventsByDay(events, cutoffTs, todayStart);
}

async function bucketQueueEvents(
  ctx: QueryCtx,
  connectorId: Id<'connectors'>,
  queueName: string,
  cutoffTs: number,
  eventLimit: number,
) {
  const events = await ctx.db
    .query('ingestEvents')
    .withIndex('by_connector_queue_ts', (q) =>
      q.eq('connectorId', connectorId).eq('queueName', queueName).gte('ts', cutoffTs),
    )
    .order('desc')
    .take(eventLimit);
  return { name: queueName, events };
}

function getEventLimit(eventLimit: number | undefined): number {
  if (eventLimit === undefined) {
    return defaultEventsPerQuery;
  }
  if (!Number.isInteger(eventLimit) || eventLimit < 1 || eventLimit > maxEventsPerQuery) {
    throw new Error(`eventLimit must be between 1 and ${maxEventsPerQuery}`);
  }
  return eventLimit;
}

export const getByConnector = query({
  args: { projectId: v.id('projects'), connectorId: v.id('connectors') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const config = await ctx.db
      .query('statusPageConfigs')
      .withIndex('by_connector', (q) => q.eq('connectorId', args.connectorId))
      .unique();
    if (!config || config.projectId !== args.projectId) {
      return null;
    }
    return config;
  },
});

export const upsert = mutation({
  args: {
    projectId: v.id('projects'),
    connectorId: v.id('connectors'),
    slug: v.string(),
    isEnabled: v.boolean(),
    title: v.string(),
    queueNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    if (!/^[a-z0-9-]{3,50}$/.test(args.slug)) {
      throw new Error('invalid slug');
    }
    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.projectId !== args.projectId) {
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
      projectId: args.projectId,
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
    projectId: v.id('projects'),
    configId: v.id('statusPageConfigs'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const config = await ctx.db.get(args.configId);
    if (!config || config.projectId !== args.projectId) {
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
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    return await ctx.storage.generateUploadUrl();
  },
});

// ---------------------------------------------------------------------------
// Public — unauthenticated by design. Recipient-facing status pages must
// stay reachable with no Convex Auth session; projectId is stored on the
// config but never required by these two queries, so the public interface
// is unchanged from before projects existed.
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
  args: { slug: v.string(), eventLimit: v.optional(v.number()) },
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
    const eventLimit = getEventLimit(args.eventLimit);

    if (queueNames.length === 0) {
      const { days, rate90d } = await bucketConnectorEvents(
        ctx,
        config.connectorId,
        cutoffTs,
        todayStart,
        eventLimit,
      );
      return { overall_rate_90d: rate90d, overall: days, queues: [] };
    }

    const perQueue = await Promise.all(
      queueNames.map((name) =>
        bucketQueueEvents(ctx, config.connectorId, name, cutoffTs, eventLimit),
      ),
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
