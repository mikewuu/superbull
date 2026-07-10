import { z } from 'zod';
import type { BaseAdapter } from '../queue-adapters/base-adapter';
import type { BoardRequest, HandlerResponse, MetricsType, QueueMetrics } from '../types';

const querySchema = z.object({
  type: z.enum(['completed', 'failed']).default('completed'),
  start: z.coerce.number().int().nonnegative().default(0),
  end: z.coerce.number().int().default(-1),
});

export async function getQueueMetrics(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid query', issues: parsed.error.issues } };
  }

  const { type, start, end } = parsed.data;
  const nativeMetrics = await queue.getMetrics(type, start, end).catch(() => null);
  if (nativeMetrics && nativeMetrics.data.length > 0) {
    return { body: nativeMetrics };
  }

  const derivedMetrics = await deriveMetricsFromJobs(queue, type);
  return { body: derivedMetrics };
}

// Native BullMQ metrics only exist when the consumer's workers opt in; deriving
// buckets from finished jobs keeps charts working with zero worker config.
const derivedWindowMinutes = 60;
const derivedScanSize = 1000;

async function deriveMetricsFromJobs(queue: BaseAdapter, type: MetricsType): Promise<QueueMetrics> {
  const counts = await queue.getJobCounts();
  const jobs = await queue.getJobs([type], 0, derivedScanSize - 1, false);
  const now = Date.now();
  const buckets = new Array<number>(derivedWindowMinutes).fill(0);

  for (const job of jobs) {
    const { finishedOn } = job.toJSON();
    if (!finishedOn) {
      continue;
    }
    const minutesAgo = Math.floor((now - finishedOn) / 60_000);
    if (minutesAgo >= 0 && minutesAgo < derivedWindowMinutes) {
      const current = buckets[minutesAgo] ?? 0;
      buckets[minutesAgo] = current + 1;
    }
  }

  return {
    meta: { count: counts[type] ?? 0, prev_ts: now, prev_count: 0 },
    data: buckets,
    count: buckets.length,
  };
}
