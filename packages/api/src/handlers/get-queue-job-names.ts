import type { BoardRequest, HandlerResponse, JobStatus, QueueJob } from '../types';

export interface JobNameStats {
  name: string;
  completed_count: number;
  failed_count: number;
  pending_count: number;
  failure_rate: number;
  avg_duration_ms: number | null;
  last_seen_ms: number;
  activity: number[];
}

const finishedScanSize = 1000;
const pendingScanSize = 500;
const activityBucketCount = 24;
const pendingStatuses: JobStatus[] = ['waiting', 'prioritized', 'delayed', 'active'];

export async function getQueueJobNames(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const completed = await queue.getJobs(['completed'], 0, finishedScanSize - 1, false);
  const failed = await queue.getJobs(['failed'], 0, finishedScanSize - 1, false);
  const pending = await queue.getJobs(pendingStatuses, 0, pendingScanSize - 1, false);

  const byName = new Map<string, JobNameStats & { durations: number[] }>();
  const now = Date.now();

  const entryFor = (name: string) => {
    const existing = byName.get(name);
    if (existing) {
      return existing;
    }
    const created = {
      name,
      completed_count: 0,
      failed_count: 0,
      pending_count: 0,
      failure_rate: 0,
      avg_duration_ms: null,
      last_seen_ms: 0,
      activity: new Array<number>(activityBucketCount).fill(0),
      durations: [] as number[],
    };
    byName.set(name, created);
    return created;
  };

  const recordActivity = (entry: JobNameStats, finishedOn: number | null | undefined) => {
    if (!finishedOn) {
      return;
    }
    const hoursAgo = Math.floor((now - finishedOn) / 3_600_000);
    if (hoursAgo >= 0 && hoursAgo < activityBucketCount) {
      entry.activity[hoursAgo] = (entry.activity[hoursAgo] ?? 0) + 1;
    }
  };

  const recordLastSeen = (entry: JobNameStats, job: QueueJob) => {
    const { timestamp } = job.toJSON();
    if (timestamp > entry.last_seen_ms) {
      entry.last_seen_ms = timestamp;
    }
  };

  for (const job of completed) {
    const json = job.toJSON();
    const entry = entryFor(json.name);
    entry.completed_count += 1;
    recordActivity(entry, json.finishedOn);
    recordLastSeen(entry, job);
    if (json.processedOn && json.finishedOn) {
      entry.durations.push(json.finishedOn - json.processedOn);
    }
  }

  for (const job of failed) {
    const json = job.toJSON();
    const entry = entryFor(json.name);
    entry.failed_count += 1;
    recordActivity(entry, json.finishedOn);
    recordLastSeen(entry, job);
  }

  for (const job of pending) {
    const json = job.toJSON();
    const entry = entryFor(json.name);
    entry.pending_count += 1;
    recordLastSeen(entry, job);
  }

  const jobNames = [...byName.values()]
    .map(({ durations, ...entry }) => {
      const finishedCount = entry.completed_count + entry.failed_count;
      return {
        ...entry,
        failure_rate: finishedCount === 0 ? 0 : entry.failed_count / finishedCount,
        avg_duration_ms:
          durations.length === 0
            ? null
            : Math.round(durations.reduce((total, value) => total + value, 0) / durations.length),
      };
    })
    .sort((a, b) => b.last_seen_ms - a.last_seen_ms);

  return { body: { job_names: jobNames } };
}
