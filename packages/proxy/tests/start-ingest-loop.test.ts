import { BullMQAdapter } from '@superbull/api';
import { type Job, Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IngestBatcher, IngestEvent } from '../src/create-ingest-batcher';
import { type IngestLoop, startIngestLoop } from '../src/start-ingest-loop';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

function makeRecordingBatcher(): IngestBatcher & { events: IngestEvent[] } {
  const events: IngestEvent[] = [];
  return {
    events,
    enqueue: (event) => events.push(event),
    flush: async () => undefined,
    stop: () => undefined,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('startIngestLoop', () => {
  let queue: Queue;
  let worker: Worker | undefined;
  let loop: IngestLoop | undefined;

  beforeEach(async () => {
    queue = new Queue(`ingest-loop-${process.pid}-${Date.now()}`, { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    loop?.stop();
    await worker?.close();
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  it('emits completed/failed events exactly once and periodic snapshots', async () => {
    const adapter = new BullMQAdapter(queue);
    const batcher = makeRecordingBatcher();

    loop = startIngestLoop({
      queues: [adapter],
      batcher,
      pollIntervalMs: 150,
      snapshotIntervalMs: 200,
    });

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

    const completed = batcher.events.filter((event) => event.type === 'job.completed');
    const failed = batcher.events.filter((event) => event.type === 'job.failed');
    const snapshots = batcher.events.filter((event) => event.type === 'queue.snapshot');

    expect(completed).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.failed_reason).toContain('boom');
    expect(snapshots.length).toBeGreaterThan(0);

    const uuids = batcher.events.map((event) => event.uuid);
    expect(new Set(uuids).size).toBe(uuids.length);
  });
});
