import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { type QueryCtx, query } from './_generated/server';
import { requireWorkspaceMember } from './access';

const maxEventsPerQuery = 1000;
const maxBuckets = 3000;

async function guardConnector(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
): Promise<void> {
  const connector = await ctx.db.get(connectorId);
  if (!connector || connector.workspaceId !== workspaceId) {
    throw new Error('unknown connector');
  }
}

// Descending so that when a window holds more than the cap, truncation drops
// the oldest events and keeps the most recent activity.
async function queryEvents(
  ctx: QueryCtx,
  connectorId: Id<'connectors'>,
  queueName: string | undefined,
  fromTs: number,
  toTs: number,
) {
  if (queueName) {
    return await ctx.db
      .query('ingestEvents')
      .withIndex('by_connector_queue_ts', (q) =>
        q
          .eq('connectorId', connectorId)
          .eq('queueName', queueName)
          .gte('ts', fromTs)
          .lte('ts', toTs),
      )
      .order('desc')
      .take(maxEventsPerQuery);
  }
  return await ctx.db
    .query('ingestEvents')
    .withIndex('by_connector_ts', (q) =>
      q.eq('connectorId', connectorId).gte('ts', fromTs).lte('ts', toTs),
    )
    .order('desc')
    .take(maxEventsPerQuery);
}

function guardBucketMs(fromTs: number, toTs: number, bucketMinutes: number): number {
  const bucketMs = bucketMinutes * 60_000;
  const bucketCount = Math.floor((toTs - fromTs) / bucketMs) + 1;
  if (bucketCount > maxBuckets) {
    throw new Error('bucketMinutes too small for the requested range');
  }
  return bucketMs;
}

function bucketTsFor(ts: number, bucketMs: number): number {
  return Math.floor(ts / bucketMs) * bucketMs;
}

function listBucketTimestamps(fromTs: number, toTs: number, bucketMs: number): number[] {
  const first = bucketTsFor(fromTs, bucketMs);
  const last = bucketTsFor(toTs, bucketMs);
  const timestamps: number[] = [];
  for (let ts = first; ts <= last; ts += bucketMs) {
    timestamps.push(ts);
  }
  return timestamps;
}

function percentile(sortedValues: number[], p: number): number {
  const index = Math.min(sortedValues.length - 1, Math.floor(p * sortedValues.length));
  const value = sortedValues[index];
  if (value === undefined) {
    throw new Error('percentile called on an empty array');
  }
  return value;
}

function percentileOrNull(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return percentile(sorted, p);
}

export const throughputSeries = query({
  args: {
    workspaceId: v.id('workspaces'),
    connectorId: v.id('connectors'),
    queueName: v.optional(v.string()),
    fromTs: v.number(),
    toTs: v.number(),
    bucketMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    await guardConnector(ctx, args.workspaceId, args.connectorId);
    const bucketMs = guardBucketMs(args.fromTs, args.toTs, args.bucketMinutes);
    const events = await queryEvents(ctx, args.connectorId, args.queueName, args.fromTs, args.toTs);

    const timestamps = listBucketTimestamps(args.fromTs, args.toTs, bucketMs);
    const counts = new Map(timestamps.map((ts) => [ts, { completed: 0, failed: 0 }]));
    for (const event of events) {
      const bucket = counts.get(bucketTsFor(event.ts, bucketMs));
      if (!bucket) {
        continue;
      }
      if (event.type === 'job.completed') {
        bucket.completed++;
      } else if (event.type === 'job.failed') {
        bucket.failed++;
      }
    }

    return timestamps.map((bucket_ts) => {
      const bucket = counts.get(bucket_ts);
      return { bucket_ts, completed: bucket?.completed ?? 0, failed: bucket?.failed ?? 0 };
    });
  },
});

export const latencySeries = query({
  args: {
    workspaceId: v.id('workspaces'),
    connectorId: v.id('connectors'),
    queueName: v.optional(v.string()),
    fromTs: v.number(),
    toTs: v.number(),
    bucketMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    await guardConnector(ctx, args.workspaceId, args.connectorId);
    const bucketMs = guardBucketMs(args.fromTs, args.toTs, args.bucketMinutes);
    const events = await queryEvents(ctx, args.connectorId, args.queueName, args.fromTs, args.toTs);

    const timestamps = listBucketTimestamps(args.fromTs, args.toTs, bucketMs);
    const samples = new Map(
      timestamps.map((ts) => [ts, { wait: [] as number[], run: [] as number[] }]),
    );
    for (const event of events) {
      if (event.type !== 'job.completed' && event.type !== 'job.failed') {
        continue;
      }
      const bucket = samples.get(bucketTsFor(event.ts, bucketMs));
      if (!bucket) {
        continue;
      }
      if (event.waitMs !== undefined) {
        bucket.wait.push(event.waitMs);
      }
      if (event.durationMs !== undefined) {
        bucket.run.push(event.durationMs);
      }
    }

    return timestamps.map((bucket_ts) => {
      const bucket = samples.get(bucket_ts);
      const wait = bucket?.wait ?? [];
      const run = bucket?.run ?? [];
      return {
        bucket_ts,
        wait_p50: percentileOrNull(wait, 0.5),
        wait_p95: percentileOrNull(wait, 0.95),
        run_p50: percentileOrNull(run, 0.5),
        run_p95: percentileOrNull(run, 0.95),
      };
    });
  },
});

export const queueTotals = query({
  args: {
    workspaceId: v.id('workspaces'),
    connectorId: v.id('connectors'),
    fromTs: v.number(),
    toTs: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    await guardConnector(ctx, args.workspaceId, args.connectorId);
    const events = await queryEvents(ctx, args.connectorId, undefined, args.fromTs, args.toTs);

    const totals = new Map<
      string,
      { completed: number; failed: number; durationMsSum: number; durationCount: number }
    >();
    for (const event of events) {
      if (event.type !== 'job.completed' && event.type !== 'job.failed') {
        continue;
      }
      const existing = totals.get(event.queueName) ?? {
        completed: 0,
        failed: 0,
        durationMsSum: 0,
        durationCount: 0,
      };
      if (event.type === 'job.completed') {
        existing.completed++;
      } else {
        existing.failed++;
      }
      if (event.durationMs !== undefined) {
        existing.durationMsSum += event.durationMs;
        existing.durationCount++;
      }
      totals.set(event.queueName, existing);
    }

    return Array.from(totals.entries()).map(([queue_name, queueTotal]) => ({
      queue_name,
      completed: queueTotal.completed,
      failed: queueTotal.failed,
      job_seconds: queueTotal.durationCount > 0 ? queueTotal.durationMsSum / 1000 : null,
    }));
  },
});

export const heatmap = query({
  args: {
    workspaceId: v.id('workspaces'),
    connectorId: v.id('connectors'),
    fromTs: v.number(),
    toTs: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    await guardConnector(ctx, args.workspaceId, args.connectorId);
    const events = await queryEvents(ctx, args.connectorId, undefined, args.fromTs, args.toTs);

    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const event of events) {
      if (event.type !== 'job.completed' && event.type !== 'job.failed') {
        continue;
      }
      const date = new Date(event.ts);
      const weekdayRow = matrix[date.getUTCDay()];
      if (!weekdayRow) {
        continue;
      }
      const hour = date.getUTCHours();
      weekdayRow[hour] = (weekdayRow[hour] ?? 0) + 1;
    }

    return { matrix, timezone: 'UTC' as const };
  },
});
