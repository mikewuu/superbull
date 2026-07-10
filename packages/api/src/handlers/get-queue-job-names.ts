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

type JobNameAccumulator = JobNameStats & { durations: number[] };

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

  const now = Date.now();
  const byName = new Map<string, JobNameAccumulator>();
  for (const job of completed) {
    recordCompleted(byName, job, now);
  }
  for (const job of failed) {
    recordFailed(byName, job, now);
  }
  for (const job of pending) {
    recordPending(byName, job);
  }

  const jobNames = [...byName.values()]
    .map(toJobNameStats)
    .sort((a, b) => b.last_seen_ms - a.last_seen_ms);

  return { body: { job_names: jobNames } };
}

function entryFor(byName: Map<string, JobNameAccumulator>, name: string): JobNameAccumulator {
  const existing = byName.get(name);
  if (existing) {
    return existing;
  }
  const created: JobNameAccumulator = {
    name,
    completed_count: 0,
    failed_count: 0,
    pending_count: 0,
    failure_rate: 0,
    avg_duration_ms: null,
    last_seen_ms: 0,
    activity: new Array<number>(activityBucketCount).fill(0),
    durations: [],
  };
  byName.set(name, created);
  return created;
}

function recordCompleted(
  byName: Map<string, JobNameAccumulator>,
  job: QueueJob,
  now: number,
): void {
  const json = job.toJSON();
  const entry = entryFor(byName, json.name);
  entry.completed_count += 1;
  recordActivity(entry, json.finishedOn, now);
  recordLastSeen(entry, json.timestamp);
  if (json.processedOn && json.finishedOn) {
    entry.durations.push(json.finishedOn - json.processedOn);
  }
}

function recordFailed(byName: Map<string, JobNameAccumulator>, job: QueueJob, now: number): void {
  const json = job.toJSON();
  const entry = entryFor(byName, json.name);
  entry.failed_count += 1;
  recordActivity(entry, json.finishedOn, now);
  recordLastSeen(entry, json.timestamp);
}

function recordPending(byName: Map<string, JobNameAccumulator>, job: QueueJob): void {
  const json = job.toJSON();
  const entry = entryFor(byName, json.name);
  entry.pending_count += 1;
  recordLastSeen(entry, json.timestamp);
}

function recordActivity(
  entry: JobNameStats,
  finishedOn: number | null | undefined,
  now: number,
): void {
  if (!finishedOn) {
    return;
  }
  const hoursAgo = Math.floor((now - finishedOn) / 3_600_000);
  if (hoursAgo >= 0 && hoursAgo < activityBucketCount) {
    entry.activity[hoursAgo] = (entry.activity[hoursAgo] ?? 0) + 1;
  }
}

function recordLastSeen(entry: JobNameStats, timestamp: number): void {
  if (timestamp > entry.last_seen_ms) {
    entry.last_seen_ms = timestamp;
  }
}

function toJobNameStats(entry: JobNameAccumulator): JobNameStats {
  const { durations, ...stats } = entry;
  const finishedCount = stats.completed_count + stats.failed_count;
  return {
    ...stats,
    failure_rate: finishedCount === 0 ? 0 : stats.failed_count / finishedCount,
    avg_duration_ms:
      durations.length === 0
        ? null
        : Math.round(durations.reduce((total, value) => total + value, 0) / durations.length),
  };
}
