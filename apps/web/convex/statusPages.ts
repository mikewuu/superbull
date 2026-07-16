import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { type QueryCtx, mutation, query } from './_generated/server';

function guardInternalToken(internalToken: string): void {
  if (internalToken !== process.env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('unauthorized');
  }
}

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

async function bucketSourceEvents(
  ctx: QueryCtx,
  sourceId: Id<'proxySources'>,
  cutoffTs: number,
  todayStart: number,
) {
  const events = await ctx.db
    .query('ingestEvents')
    .withIndex('by_source_ts', (q) => q.eq('sourceId', sourceId).gte('ts', cutoffTs))
    .take(maxEventsPerQuery);
  return bucketEventsByDay(events, cutoffTs, todayStart);
}

async function bucketQueueEvents(
  ctx: QueryCtx,
  sourceId: Id<'proxySources'>,
  queueName: string,
  cutoffTs: number,
) {
  const events = await ctx.db
    .query('ingestEvents')
    .withIndex('by_source_queue_ts', (q) =>
      q.eq('sourceId', sourceId).eq('queueName', queueName).gte('ts', cutoffTs),
    )
    .take(maxEventsPerQuery);
  return { name: queueName, events };
}

export const getBySource = query({
  args: { internalToken: v.string(), sourceId: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      return null;
    }
    return await ctx.db
      .query('statusPageConfigs')
      .withIndex('by_source', (q) => q.eq('sourceId', sourceId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    internalToken: v.string(),
    sourceId: v.string(),
    slug: v.string(),
    isEnabled: v.boolean(),
    title: v.string(),
    queueNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    if (!/^[a-z0-9-]{3,50}$/.test(args.slug)) {
      throw new Error('invalid slug');
    }
    const sourceId = ctx.db.normalizeId('proxySources', args.sourceId);
    if (!sourceId) {
      throw new Error('unknown source');
    }

    const bySlug = await ctx.db
      .query('statusPageConfigs')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (bySlug && bySlug.sourceId !== sourceId) {
      throw new Error('slug already taken');
    }

    const existing =
      bySlug ??
      (await ctx.db
        .query('statusPageConfigs')
        .withIndex('by_source', (q) => q.eq('sourceId', sourceId))
        .unique());

    const fields = {
      sourceId,
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
  args: { internalToken: v.string(), configId: v.string(), storageId: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    const configId = ctx.db.normalizeId('statusPageConfigs', args.configId);
    if (!configId) {
      throw new Error('unknown status page config');
    }
    const storageId = ctx.db.system.normalizeId('_storage', args.storageId);
    if (!storageId) {
      throw new Error('unknown storage id');
    }

    await ctx.db.patch(configId, { logoStorageId: storageId });
    const patched = await ctx.db.get(configId);
    if (!patched) {
      throw new Error('failed to set logo');
    }
    return patched;
  },
});

export const generateLogoUploadUrl = mutation({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    guardInternalToken(args.internalToken);
    return await ctx.storage.generateUploadUrl();
  },
});

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
      const { days, rate90d } = await bucketSourceEvents(
        ctx,
        config.sourceId,
        cutoffTs,
        todayStart,
      );
      return { overall_rate_90d: rate90d, overall: days, queues: [] };
    }

    const perQueue = await Promise.all(
      queueNames.map((name) => bucketQueueEvents(ctx, config.sourceId, name, cutoffTs)),
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
