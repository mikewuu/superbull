export interface IngestEvent {
  uuid: string;
  type: 'job.completed' | 'job.failed' | 'queue.snapshot';
  queue_name: string;
  ts: number;
  job_name?: string;
  job_id?: string | number;
  duration_ms?: number | null;
  wait_ms?: number | null;
  failed_reason?: string;
  counts?: Record<string, number>;
  worker_count?: number;
  oldest_waiting_ms?: number | null;
}

export interface IngestBatcher {
  enqueue: (event: IngestEvent) => void;
  flush: () => Promise<void>;
  stop: () => void;
}

export function createIngestBatcher(args: {
  hubUrl: string;
  sourceId: string;
  sourceToken: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  fetchImpl?: typeof fetch;
}): IngestBatcher {
  const {
    hubUrl,
    sourceId,
    sourceToken,
    flushIntervalMs = 5000,
    maxBatchSize = 100,
    fetchImpl = fetch,
  } = args;

  let pending: IngestEvent[] = [];
  const timer = setInterval(() => {
    flush().catch(() => undefined);
  }, flushIntervalMs);
  timer.unref?.();

  async function flush(): Promise<void> {
    if (pending.length === 0) {
      return;
    }
    const events = pending;
    pending = [];
    await sendWithRetry(events);
  }

  async function sendWithRetry(events: IngestEvent[]): Promise<void> {
    const ok = await postEvents(events);
    if (ok) {
      return;
    }
    await sleep(3000);
    const retried = await postEvents(events);
    if (!retried) {
      console.warn(`superbull-proxy: dropped ${events.length} ingest event(s) after retry`);
    }
  }

  async function postEvents(events: IngestEvent[]): Promise<boolean> {
    try {
      const response = await fetchImpl(`${hubUrl}/api/ingest`, {
        method: 'POST',
        headers: { authorization: `Bearer ${sourceToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: sourceId, events }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return {
    enqueue(event: IngestEvent) {
      pending.push(event);
      if (pending.length >= maxBatchSize) {
        flush().catch(() => undefined);
      }
    },
    flush,
    stop() {
      clearInterval(timer);
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
