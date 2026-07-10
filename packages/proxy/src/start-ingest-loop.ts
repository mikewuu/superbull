import type { BaseAdapter, QueueJobJson } from '@superbull/api';
import type { IngestBatcher, IngestEvent } from './create-ingest-batcher';

export interface IngestLoop {
  stop: () => void;
}

export function startIngestLoop(args: {
  queues: ReadonlyArray<BaseAdapter>;
  batcher: IngestBatcher;
  pollIntervalMs?: number;
  snapshotIntervalMs?: number;
}): IngestLoop {
  const { queues, batcher, pollIntervalMs = 5000, snapshotIntervalMs = 60000 } = args;
  const cursors = new Map<string, number>(queues.map((queue) => [queue.getName(), Date.now()]));
  let lastSnapshotAt = 0;

  async function poll(): Promise<void> {
    const shouldSnapshot = Date.now() - lastSnapshotAt >= snapshotIntervalMs;
    for (const queue of queues) {
      await pollQueue(queue, cursors, batcher);
      if (shouldSnapshot) {
        await enqueueSnapshot(queue, batcher);
      }
    }
    if (shouldSnapshot) {
      lastSnapshotAt = Date.now();
    }
  }

  const timer = setInterval(() => {
    poll().catch(() => undefined);
  }, pollIntervalMs);
  timer.unref?.();

  return {
    stop() {
      clearInterval(timer);
    },
  };
}

async function pollQueue(
  queue: BaseAdapter,
  cursors: Map<string, number>,
  batcher: IngestBatcher,
): Promise<void> {
  const queueName = queue.getName();
  const cursor = cursors.get(queueName) ?? 0;
  const [completed, failed] = await Promise.all([
    queue.getJobs(['completed'], 0, 199, false),
    queue.getJobs(['failed'], 0, 199, false),
  ]);

  let maxFinishedOn = cursor;
  for (const job of completed) {
    maxFinishedOn = enqueueIfNew(
      queueName,
      job.toJSON(),
      'job.completed',
      cursor,
      maxFinishedOn,
      batcher,
    );
  }
  for (const job of failed) {
    maxFinishedOn = enqueueIfNew(
      queueName,
      job.toJSON(),
      'job.failed',
      cursor,
      maxFinishedOn,
      batcher,
    );
  }
  cursors.set(queueName, maxFinishedOn);
}

function enqueueIfNew(
  queueName: string,
  jobJson: QueueJobJson,
  type: 'job.completed' | 'job.failed',
  cursor: number,
  maxFinishedOn: number,
  batcher: IngestBatcher,
): number {
  const finishedOn = jobJson.finishedOn ?? 0;
  if (!finishedOn || finishedOn <= cursor) {
    return maxFinishedOn;
  }
  batcher.enqueue(buildTerminalEvent(queueName, jobJson, type));
  return Math.max(maxFinishedOn, finishedOn);
}

function buildTerminalEvent(
  queueName: string,
  jobJson: QueueJobJson,
  type: 'job.completed' | 'job.failed',
): IngestEvent {
  const finishedOn = jobJson.finishedOn as number;
  const processedOn = jobJson.processedOn ?? null;
  const event: IngestEvent = {
    uuid: `${queueName}:${type}:${jobJson.id}:${finishedOn}`,
    type,
    queue_name: queueName,
    ts: finishedOn,
    job_name: jobJson.name,
    job_id: jobJson.id ?? undefined,
    duration_ms: processedOn === null ? null : finishedOn - processedOn,
    wait_ms: processedOn === null ? null : processedOn - jobJson.timestamp,
  };
  if (type === 'job.failed') {
    event.failed_reason = (jobJson.failedReason ?? '').slice(0, 500);
  }
  return event;
}

async function enqueueSnapshot(queue: BaseAdapter, batcher: IngestBatcher): Promise<void> {
  const [counts, workerCount, oldestWaitingTimestamp] = await Promise.all([
    queue.getJobCounts(),
    queue.getWorkerCount(),
    queue.findOldestWaitingJobTimestamp(),
  ]);
  const ts = Date.now();
  batcher.enqueue({
    uuid: `${queue.getName()}:snapshot:${ts}`,
    type: 'queue.snapshot',
    queue_name: queue.getName(),
    ts,
    counts,
    worker_count: workerCount,
    oldest_waiting_ms:
      oldestWaitingTimestamp === null ? null : Math.max(0, ts - oldestWaitingTimestamp),
  });
}
