import { BullMQAdapter } from '@superbull/api';
import type { IngestEvent } from '@superbull/protocol';
import { type Job, Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Ingest, startIngest } from '../src/start-ingest';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('startIngest', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let ingest: Ingest | undefined;

  beforeEach(async () => {
    queue = new Queue(`connector-ingest-${process.pid}-${Date.now()}`, { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    await ingest?.stop();
    ingest = undefined;
    await worker?.close();
    worker = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('emits job.completed/job.failed once via QueueEvents, plus periodic snapshots', async () => {
    const adapter = new BullMQAdapter(queue);
    const events: IngestEvent[] = [];

    ingest = startIngest({
      queues: [adapter],
      connection,
      prefix: 'bull',
      enqueue: (event) => events.push(event),
      snapshotIntervalMs: 300,
    });
    await ingest.ready();

    worker = new Worker(
      queue.name,
      async (job: Job) => {
        if (job.data.fail) {
          throw new Error('boom');
        }
        return { ok: true };
      },
      { connection },
    );

    await queue.add('ok-job', {}, { attempts: 1 });
    await queue.add('bad-job', { fail: true }, { attempts: 1 });

    await sleep(1500);

    const completed = events.filter((event) => event.type === 'job.completed');
    const failed = events.filter((event) => event.type === 'job.failed');
    const snapshots = events.filter((event) => event.type === 'queue.snapshot');

    expect(completed).toHaveLength(1);
    expect(completed[0]?.job_name).toBe('ok-job');
    expect(completed[0]?.duration_ms).not.toBeUndefined();
    expect(completed[0]?.wait_ms).not.toBeUndefined();

    expect(failed).toHaveLength(1);
    expect(failed[0]?.failed_reason).toContain('boom');

    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0]?.counts).toBeDefined();
    expect(snapshots[0]?.worker_count).toBeGreaterThanOrEqual(0);

    for (const event of [...completed, ...failed]) {
      expect(event.uuid.startsWith(`${adapter.getName()}:`)).toBe(true);
    }
    const uuids = events.map((event) => event.uuid);
    expect(new Set(uuids).size).toBe(uuids.length);
  });

  it('resumes from lastEventId so a fresh reader skips an already-acked event', async () => {
    const adapter = new BullMQAdapter(queue);
    worker = new Worker(queue.name, async () => ({ ok: true }), { connection });

    const firstEvents: IngestEvent[] = [];
    let firstIngest: Ingest | undefined = startIngest({
      queues: [adapter],
      connection,
      prefix: 'bull',
      enqueue: (event) => firstEvents.push(event),
      snapshotIntervalMs: 60_000,
    });
    await firstIngest.ready();

    await queue.add('job-1', {});
    await sleep(800);

    const firstCompleted = firstEvents.filter((event) => event.type === 'job.completed');
    expect(firstCompleted).toHaveLength(1);
    const firstStreamId = firstCompleted[0]?.uuid.split(':').pop();
    expect(firstStreamId).toBeDefined();

    await firstIngest?.stop();
    firstIngest = undefined;

    const secondEvents: IngestEvent[] = [];
    ingest = startIngest({
      queues: [adapter],
      connection,
      prefix: 'bull',
      enqueue: (event) => secondEvents.push(event),
      getLastEventId: () => firstStreamId,
      snapshotIntervalMs: 60_000,
    });
    await ingest.ready();

    await queue.add('job-2', {});
    await sleep(800);

    const secondCompleted = secondEvents.filter((event) => event.type === 'job.completed');
    // Only job-2's completion should show up — job-1's is not re-delivered.
    expect(secondCompleted).toHaveLength(1);
    expect(secondCompleted[0]?.job_name).toBe('job-2');
  });
});
