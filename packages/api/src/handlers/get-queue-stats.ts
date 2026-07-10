import type { BoardRequest, HandlerResponse, JobStatus, QueueJob, QueueJobJson } from '../types';

const finishedWindowSize = 1000;
const throughputWindowMs = 600_000;
const topErrorLimit = 10;
const errorMessageMaxChars = 200;

export async function getQueueStats(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const [completed, failed, counts] = await Promise.all([
    queue.getJobs(['completed'], 0, finishedWindowSize - 1, false),
    queue.getJobs(['failed'], 0, finishedWindowSize - 1, false),
    queue.getJobCounts(),
  ]);
  const finished = [...completed, ...failed];

  const waitTimes = collectDurations(finished, (json) =>
    json.processedOn != null ? json.processedOn - json.timestamp : null,
  );
  const runTimes = collectDurations(finished, (json) =>
    json.processedOn != null && json.finishedOn != null ? json.finishedOn - json.processedOn : null,
  );
  const retriedCount = finished.filter((job) => job.toJSON().attemptsMade > 1).length;
  const stalledCount = finished.filter((job) => job.toJSON().stalledCounter > 0).length;

  return {
    body: {
      wait_ms: { p50: percentile(waitTimes, 50), p95: percentile(waitTimes, 95) },
      run_ms: { p50: percentile(runTimes, 50), p95: percentile(runTimes, 95) },
      retry_rate: finished.length === 0 ? 0 : retriedCount / finished.length,
      stalled_count: stalledCount,
      failed_count_window: failed.length,
      completed_count_window: completed.length,
      top_errors: getTopErrors(failed),
      est_drain_ms: getEstimatedDrainMs(counts, completed),
    },
  };
}

function collectDurations(
  jobs: QueueJob[],
  toDuration: (json: QueueJobJson) => number | null,
): number[] {
  return jobs
    .map((job) => toDuration(job.toJSON()))
    .filter((value): value is number => value !== null && value >= 0)
    .sort((a, b) => a - b);
}

function percentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) {
    return null;
  }
  const index = Math.min(sortedValues.length - 1, Math.floor((p / 100) * sortedValues.length));
  return sortedValues[index] ?? null;
}

function getTopErrors(failed: QueueJob[]): { message: string; count: number }[] {
  const countByMessage = new Map<string, number>();
  for (const job of failed) {
    const { failedReason } = job.toJSON();
    if (!failedReason) {
      continue;
    }
    const message = (failedReason.split('\n')[0] ?? '').slice(0, errorMessageMaxChars);
    countByMessage.set(message, (countByMessage.get(message) ?? 0) + 1);
  }

  return [...countByMessage.entries()]
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topErrorLimit);
}

function getEstimatedDrainMs(
  counts: Record<JobStatus, number>,
  completed: QueueJob[],
): number | null {
  const backlog = (counts.waiting ?? 0) + (counts.prioritized ?? 0);
  if (backlog === 0) {
    return 0;
  }

  const now = Date.now();
  const recentCompletions = completed.filter((job) => {
    const { finishedOn } = job.toJSON();
    return finishedOn != null && now - finishedOn <= throughputWindowMs;
  }).length;
  if (recentCompletions === 0) {
    return null;
  }

  return Math.round((backlog * throughputWindowMs) / recentCompletions);
}
