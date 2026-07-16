import type { BaseAdapter } from '@superbull/api';
import type { IngestEvent } from '@superbull/protocol';
import { QueueEvents } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export interface StartIngestArgs {
  queues: ReadonlyArray<BaseAdapter>;
  /** Connection OPTIONS (not a shared client) — QueueEvents needs its own blocking connection. */
  connection: RedisOptions;
  /** BullMQ Redis key prefix, e.g. "bull". */
  prefix: string;
  enqueue: (event: IngestEvent) => void;
  /** Resume a queue's stream from the highest acked event id, if known. */
  getLastEventId?: (queueName: string) => string | undefined;
  snapshotIntervalMs?: number;
}

export interface Ingest {
  /** Resolves once every queue's QueueEvents stream reader is connected. */
  ready(): Promise<void>;
  stop(): Promise<void>;
  /**
   * Tears down and recreates a single queue's QueueEvents, resuming from
   * `getLastEventId(queueName)`. Not wired to fire automatically — see the
   * module doc comment for why.
   */
  restartQueue(queueName: string): Promise<void>;
}

/**
 * Streams job.completed/job.failed events via BullMQ QueueEvents (one
 * dedicated blocking connection per monitored queue) plus a 60s
 * queue.snapshot timer per queue — the event-driven replacement for the old
 * HTTP proxy's polling ingest loop, emitting the same event shapes.
 *
 * QueueEvents cursor / Redis-reconnect note (simplification): QueueEvents
 * keeps its own in-memory read cursor for the lifetime of the instance, and
 * the underlying ioredis connection reconnects transparently on transient
 * network blips without losing that cursor — so most Redis hiccups are
 * already handled by BullMQ/ioredis with no action needed here. The cursor
 * this module actually cares about (`getLastEventId`, backed by the event
 * outbox's per-queue acked-id tracking) only matters when a QueueEvents
 * instance is torn down and recreated, e.g. after a prolonged Redis outage
 * that requires this module to give up and rebuild the reader. We expose
 * `restartQueue` for that case but do not auto-trigger it from a
 * QueueEvents 'error' event: BullMQ/ioredis already retries under the hood,
 * and reflexively recreating QueueEvents on every transient error would
 * risk *more* event loss (a fresh instance without a fresher cursor than
 * `getLastEventId` last recorded starts from "now"). A future round can
 * wire a threshold-based trigger (e.g. N consecutive errors) if needed.
 */
export function startIngest(args: StartIngestArgs): Ingest {
  const { queues, connection, prefix, enqueue, getLastEventId, snapshotIntervalMs = 60_000 } = args;

  const queuesByName = new Map(queues.map((queue) => [queue.getName(), queue]));
  const queueEventsByName = new Map<string, QueueEvents>();

  function attach(queue: BaseAdapter): void {
    const queueName = queue.getName();
    const queueEvents = new QueueEvents(queueName, {
      connection,
      prefix,
      lastEventId: getLastEventId?.(queueName),
    });

    queueEvents.on('completed', (payload, id) => {
      handleTerminal(queue, queueName, 'job.completed', payload.jobId, id).catch(() => undefined);
    });
    queueEvents.on('failed', (payload, id) => {
      handleTerminal(queue, queueName, 'job.failed', payload.jobId, id, payload.failedReason).catch(
        () => undefined,
      );
    });
    queueEvents.on('error', (error) => {
      console.warn(`superbull-connector: queue events error for "${queueName}": ${error.message}`);
    });

    queueEventsByName.set(queueName, queueEvents);
  }

  async function handleTerminal(
    queue: BaseAdapter,
    queueName: string,
    type: 'job.completed' | 'job.failed',
    jobId: string,
    streamEventId: string,
    failedReason?: string,
  ): Promise<void> {
    const ts = Date.now();
    const event: IngestEvent = {
      uuid: `${queueName}:${streamEventId}`,
      type,
      queue_name: queueName,
      ts,
      job_id: jobId,
    };
    if (type === 'job.failed' && failedReason) {
      event.failed_reason = failedReason.slice(0, 500);
    }

    try {
      const job = await queue.findJob(jobId);
      if (job) {
        const json = job.toJSON();
        const finishedOn = json.finishedOn ?? null;
        const processedOn = json.processedOn ?? null;
        event.job_name = json.name;
        event.duration_ms =
          finishedOn === null || processedOn === null ? null : finishedOn - processedOn;
        event.wait_ms = processedOn === null ? null : processedOn - json.timestamp;
      }
    } catch {
      // best-effort: duration_ms/wait_ms/job_name stay unset if the job lookup fails
    }

    enqueue(event);
  }

  async function emitSnapshot(queue: BaseAdapter): Promise<void> {
    const [counts, workerCount, oldestWaitingTimestamp] = await Promise.all([
      queue.getJobCounts(),
      queue.getWorkerCount(),
      queue.findOldestWaitingJobTimestamp(),
    ]);
    const ts = Date.now();
    enqueue({
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

  for (const queue of queues) {
    attach(queue);
  }

  const snapshotTimer = setInterval(() => {
    for (const queue of queues) {
      emitSnapshot(queue).catch(() => undefined);
    }
  }, snapshotIntervalMs);
  snapshotTimer.unref?.();

  return {
    async ready() {
      await Promise.all([...queueEventsByName.values()].map((qe) => qe.waitUntilReady()));
    },
    async stop() {
      clearInterval(snapshotTimer);
      await Promise.all([...queueEventsByName.values()].map((qe) => qe.close()));
    },
    async restartQueue(queueName: string) {
      const queue = queuesByName.get(queueName);
      if (!queue) {
        return;
      }
      const existing = queueEventsByName.get(queueName);
      if (existing) {
        await existing.close();
        queueEventsByName.delete(queueName);
      }
      attach(queue);
    },
  };
}
