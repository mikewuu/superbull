import { randomUUID } from 'node:crypto';
import { type EventsFrame, type IngestEvent, MAX_EVENTS_PER_BATCH } from '@superbull/protocol';

export interface EventOutboxOptions {
  /** Flush when this many events are buffered. Default 100. */
  batchSize?: number;
  /** Hard cap per outbound `events` frame. Default MAX_EVENTS_PER_BATCH (500). */
  maxBatchSize?: number;
  /** Flush on this interval even if batchSize hasn't been reached. Default 5s. */
  flushIntervalMs?: number;
  /** Total buffered + unacked events before we start dropping the oldest. Default 5000. */
  maxBufferedEvents?: number;
  onDrop?: (droppedCount: number) => void;
}

export interface EventOutbox {
  enqueue(event: IngestEvent): void;
  /**
   * Wires (or unwires, with `null`) the function that actually puts a frame
   * on the wire. The outbox itself is transport-agnostic: batches are formed
   * and tracked as unacked regardless of whether a transport is attached, so
   * that events buffered while disconnected are resent verbatim once
   * `resendUnacked` is called after the next successful handshake.
   */
  setTransport(send: ((frame: EventsFrame) => void) | null): void;
  /** Re-sends every currently unacked batch, in original order. Call after hello_ack. */
  resendUnacked(): void;
  /** Drops an acked batch and advances the per-queue cursor. */
  ack(batchId: string): void;
  /** Forces an immediate flush of whatever is buffered, ignoring batchSize/timer. */
  flush(): void;
  /** Highest acked QueueEvents stream id observed for a queue, if any. */
  getCursor(queueName: string): string | undefined;
  pendingCount(): number;
  unackedCount(): number;
  stop(): void;
}

export function createEventOutbox(options: EventOutboxOptions = {}): EventOutbox {
  const {
    batchSize = 100,
    maxBatchSize = MAX_EVENTS_PER_BATCH,
    flushIntervalMs = 5000,
    maxBufferedEvents = 5000,
    onDrop,
  } = options;

  const buffer: IngestEvent[] = [];
  const unackedBatches = new Map<string, IngestEvent[]>();
  const cursors = new Map<string, string>();
  let transport: ((frame: EventsFrame) => void) | null = null;
  let totalDropped = 0;

  const timer = setInterval(() => {
    flush();
  }, flushIntervalMs);
  timer.unref?.();

  function totalCount(): number {
    let unacked = 0;
    for (const events of unackedBatches.values()) {
      unacked += events.length;
    }
    return buffer.length + unacked;
  }

  function dropOldest(): void {
    const oldestBatch = unackedBatches.entries().next();
    if (!oldestBatch.done) {
      const [batchId, events] = oldestBatch.value;
      events.shift();
      if (events.length === 0) {
        unackedBatches.delete(batchId);
      }
      return;
    }
    buffer.shift();
  }

  function enqueue(event: IngestEvent): void {
    buffer.push(event);
    if (totalCount() > maxBufferedEvents) {
      dropOldest();
      totalDropped++;
      console.warn(
        `superbull-connector: outbox at capacity (${maxBufferedEvents}), dropped oldest event`,
      );
      onDrop?.(totalDropped);
    }
    if (buffer.length >= batchSize) {
      flush();
    }
  }

  function sendBatch(batchId: string, events: IngestEvent[]): void {
    transport?.({ type: 'events', batch_id: batchId, events });
  }

  function flush(): void {
    while (buffer.length > 0) {
      const chunk = buffer.splice(0, Math.min(maxBatchSize, buffer.length));
      const batchId = randomUUID();
      unackedBatches.set(batchId, chunk);
      sendBatch(batchId, chunk);
    }
  }

  function resendUnacked(): void {
    for (const [batchId, events] of unackedBatches) {
      sendBatch(batchId, events);
    }
  }

  function updateCursor(event: IngestEvent): void {
    if (event.type !== 'job.completed' && event.type !== 'job.failed') {
      return;
    }
    const prefix = `${event.queue_name}:`;
    if (!event.uuid.startsWith(prefix)) {
      return;
    }
    const streamId = event.uuid.slice(prefix.length);
    if (!isStreamId(streamId)) {
      return;
    }
    const current = cursors.get(event.queue_name);
    if (!current || compareStreamIds(streamId, current) > 0) {
      cursors.set(event.queue_name, streamId);
    }
  }

  function ack(batchId: string): void {
    const events = unackedBatches.get(batchId);
    if (!events) {
      return;
    }
    unackedBatches.delete(batchId);
    for (const event of events) {
      updateCursor(event);
    }
  }

  return {
    enqueue,
    setTransport(send) {
      transport = send;
    },
    resendUnacked,
    ack,
    flush,
    getCursor(queueName) {
      return cursors.get(queueName);
    },
    pendingCount() {
      return buffer.length;
    },
    unackedCount() {
      let count = 0;
      for (const events of unackedBatches.values()) {
        count += events.length;
      }
      return count;
    },
    stop() {
      clearInterval(timer);
    },
  };
}

function isStreamId(id: string): boolean {
  return /^\d+-\d+$/.test(id);
}

function compareStreamIds(a: string, b: string): number {
  const [aMs = 0, aSeq = 0] = a.split('-').map(Number);
  const [bMs = 0, bSeq = 0] = b.split('-').map(Number);
  return aMs !== bMs ? aMs - bMs : aSeq - bSeq;
}
