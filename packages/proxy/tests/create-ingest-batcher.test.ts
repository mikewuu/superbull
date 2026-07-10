import { describe, expect, it, vi } from 'vitest';
import { createIngestBatcher } from '../src/create-ingest-batcher';

function makeEvent(uuid: string) {
  return {
    uuid,
    type: 'job.completed' as const,
    queue_name: 'q',
    ts: Date.now(),
  };
}

describe('createIngestBatcher', () => {
  it('flushes immediately once maxBatchSize is reached', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const batcher = createIngestBatcher({
      hubUrl: 'http://hub.local',
      sourceId: 'src-1',
      sourceToken: 'proxy-token',
      maxBatchSize: 2,
      fetchImpl,
    });

    batcher.enqueue(makeEvent('a'));
    batcher.enqueue(makeEvent('b'));
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));

    batcher.stop();
  });

  it('sends the correct auth header and body shape', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const batcher = createIngestBatcher({
      hubUrl: 'http://hub.local',
      sourceId: 'src-1',
      sourceToken: 'proxy-token',
      fetchImpl,
    });

    const event = makeEvent('a');
    batcher.enqueue(event);
    await batcher.flush();

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://hub.local/api/ingest',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer proxy-token' }),
        body: JSON.stringify({ source_id: 'src-1', events: [event] }),
      }),
    );

    batcher.stop();
  });

  it('flushes on the interval', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      const batcher = createIngestBatcher({
        hubUrl: 'http://hub.local',
        sourceId: 'src-1',
        sourceToken: 'proxy-token',
        flushIntervalMs: 1000,
        fetchImpl,
      });

      batcher.enqueue(makeEvent('a'));
      expect(fetchImpl).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchImpl).toHaveBeenCalledTimes(1);

      batcher.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries once after a network error, then drops and warns', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const batcher = createIngestBatcher({
        hubUrl: 'http://hub.local',
        sourceId: 'src-1',
        sourceToken: 'proxy-token',
        fetchImpl,
      });

      batcher.enqueue(makeEvent('a'));
      const flushPromise = batcher.flush();
      await vi.advanceTimersByTimeAsync(3000);
      await flushPromise;

      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('dropped 1 ingest event'));

      warn.mockRestore();
      batcher.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries once after a 5xx response, then drops', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const batcher = createIngestBatcher({
        hubUrl: 'http://hub.local',
        sourceId: 'src-1',
        sourceToken: 'proxy-token',
        fetchImpl,
      });

      batcher.enqueue(makeEvent('a'));
      const flushPromise = batcher.flush();
      await vi.advanceTimersByTimeAsync(3000);
      await flushPromise;

      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalled();

      warn.mockRestore();
      batcher.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
