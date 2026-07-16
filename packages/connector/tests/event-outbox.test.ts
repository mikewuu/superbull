import type { EventsFrame, IngestEvent } from '@superbull/protocol';
import { describe, expect, it, vi } from 'vitest';
import { createEventOutbox } from '../src/event-outbox';

function completedEvent(queueName: string, streamId: string): IngestEvent {
  return {
    uuid: `${queueName}:${streamId}`,
    type: 'job.completed',
    queue_name: queueName,
    ts: Date.now(),
    job_id: '1',
  };
}

describe('createEventOutbox', () => {
  it('flushes immediately once batchSize is reached, capped at maxBatchSize per frame', () => {
    const sent: EventsFrame[] = [];
    const outbox = createEventOutbox({ batchSize: 3, maxBatchSize: 2, flushIntervalMs: 60_000 });
    outbox.setTransport((frame) => sent.push(frame));

    outbox.enqueue(completedEvent('q', '1-0'));
    outbox.enqueue(completedEvent('q', '2-0'));
    expect(sent).toHaveLength(0);

    outbox.enqueue(completedEvent('q', '3-0'));
    // batchSize (3) reached -> flush -> chunked into frames of at most maxBatchSize (2)
    expect(sent).toHaveLength(2);
    expect(sent[0]?.events).toHaveLength(2);
    expect(sent[1]?.events).toHaveLength(1);

    outbox.stop();
  });

  it('flushes on the timer', async () => {
    vi.useFakeTimers();
    try {
      const sent: EventsFrame[] = [];
      const outbox = createEventOutbox({ flushIntervalMs: 1000 });
      outbox.setTransport((frame) => sent.push(frame));

      outbox.enqueue(completedEvent('q', '1-0'));
      expect(sent).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(1000);
      expect(sent).toHaveLength(1);
      expect(sent[0]?.events).toHaveLength(1);

      outbox.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a batch unacked until events_ack, then drops it', () => {
    const outbox = createEventOutbox({ batchSize: 1, flushIntervalMs: 60_000 });
    const sent: EventsFrame[] = [];
    outbox.setTransport((frame) => sent.push(frame));

    outbox.enqueue(completedEvent('q', '1-0'));
    expect(outbox.unackedCount()).toBe(1);
    const batchId = sent[0]?.batch_id;
    expect(batchId).toBeDefined();

    outbox.ack(batchId as string);
    expect(outbox.unackedCount()).toBe(0);

    outbox.stop();
  });

  it('advances the per-queue cursor to the highest acked stream id only after ack', () => {
    const outbox = createEventOutbox({ batchSize: 3, flushIntervalMs: 60_000 });
    const sent: EventsFrame[] = [];
    outbox.setTransport((frame) => sent.push(frame));

    outbox.enqueue(completedEvent('q', '5-0'));
    outbox.enqueue(completedEvent('q', '12-0'));
    outbox.enqueue(completedEvent('q', '9-0'));

    expect(outbox.getCursor('q')).toBeUndefined();

    const batchId = sent[0]?.batch_id as string;
    outbox.ack(batchId);

    expect(outbox.getCursor('q')).toBe('12-0');

    outbox.stop();
  });

  it('does not transmit while no transport is attached, but keeps batches for later resend', () => {
    const outbox = createEventOutbox({ batchSize: 1, flushIntervalMs: 60_000 });

    outbox.enqueue(completedEvent('q', '1-0'));
    expect(outbox.unackedCount()).toBe(1);

    const sent: EventsFrame[] = [];
    outbox.setTransport((frame) => sent.push(frame));
    expect(sent).toHaveLength(0); // setTransport alone does not resend

    outbox.resendUnacked();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.events).toHaveLength(1);

    outbox.stop();
  });

  it('resends every unacked batch, in order, on reconnect', () => {
    const outbox = createEventOutbox({ batchSize: 1, flushIntervalMs: 60_000 });
    const firstSent: EventsFrame[] = [];
    outbox.setTransport((frame) => firstSent.push(frame));

    outbox.enqueue(completedEvent('q', '1-0'));
    outbox.enqueue(completedEvent('q', '2-0'));
    expect(firstSent).toHaveLength(2);

    // simulate disconnect
    outbox.setTransport(null);

    // simulate reconnect
    const resent: EventsFrame[] = [];
    outbox.setTransport((frame) => resent.push(frame));
    outbox.resendUnacked();

    expect(resent.map((frame) => frame.batch_id)).toEqual(firstSent.map((frame) => frame.batch_id));

    outbox.stop();
  });

  it('caps buffered+unacked events, dropping the oldest with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const outbox = createEventOutbox({
      batchSize: 100_000, // never auto-flush during this test
      flushIntervalMs: 60_000,
      maxBufferedEvents: 3,
    });

    outbox.enqueue(completedEvent('q', '1-0'));
    outbox.enqueue(completedEvent('q', '2-0'));
    outbox.enqueue(completedEvent('q', '3-0'));
    expect(outbox.pendingCount()).toBe(3);

    outbox.enqueue(completedEvent('q', '4-0'));
    expect(outbox.pendingCount()).toBe(3); // oldest (1-0) dropped
    expect(warn).toHaveBeenCalled();

    outbox.flush();
    // the oldest surviving event should be 2-0, not 1-0
    expect(outbox.unackedCount()).toBe(3);

    warn.mockRestore();
    outbox.stop();
  });
});
