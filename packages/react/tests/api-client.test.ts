import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, put, post } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: () => ({ get, put, post }) },
}));

import {
  applyBulkJobAction,
  drainQueue,
  getQueuePriorities,
  getQueueStats,
  getQueueWorkers,
  getQueues,
  obliterateQueue,
  retryJob,
  setQueueConcurrency,
} from '../src/lib/api-client';

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  post.mockReset();
});

describe('api-client boundary mapping', () => {
  it('maps camelCase params to snake_case query params', async () => {
    get.mockResolvedValue({ data: { queues: [] } });
    await getQueues({ activeQueue: 'emails', status: 'failed', page: 2 });
    expect(get).toHaveBeenCalledWith('api/queues', {
      params: {
        active_queue: 'emails',
        status: 'failed',
        page: 2,
        per_page: undefined,
        sort: undefined,
        search: undefined,
      },
    });
  });

  it('encodes queue name and job id in the retry path', async () => {
    put.mockResolvedValue({ data: {} });
    await retryJob({ queueName: 'my queue', jobId: 'a/b' });
    expect(put).toHaveBeenCalledWith('api/queues/my%20queue/a%2Fb/retry');
  });

  it('sends bulk actions with a snake_case job_ids body', async () => {
    post.mockResolvedValue({ data: {} });
    await applyBulkJobAction({ queueName: 'emails', action: 'remove', jobIds: ['1', '2'] });
    expect(post).toHaveBeenCalledWith('api/queues/emails/jobs/bulk', {
      action: 'remove',
      job_ids: ['1', '2'],
    });
  });

  it('fetches workers for a queue', async () => {
    get.mockResolvedValue({ data: { workers: [{ name: 'w1' }] } });
    const workers = await getQueueWorkers('send-emails');
    expect(get).toHaveBeenCalledWith('api/queues/send-emails/workers');
    expect(workers).toEqual([{ name: 'w1' }]);
  });

  it('sends global_concurrency as a snake_case body when setting concurrency', async () => {
    put.mockResolvedValue({ data: {} });
    await setQueueConcurrency({ queueName: 'emails', globalConcurrency: 5 });
    expect(put).toHaveBeenCalledWith('api/queues/emails/concurrency', { global_concurrency: 5 });
  });

  it('fetches priorities for a queue', async () => {
    get.mockResolvedValue({ data: { priorities: [{ priority: 1, count: 3 }] } });
    const priorities = await getQueuePriorities('process-videos');
    expect(get).toHaveBeenCalledWith('api/queues/process-videos/priorities');
    expect(priorities).toEqual([{ priority: 1, count: 3 }]);
  });

  it('fetches stats for a queue', async () => {
    const stats = {
      wait_ms: { p50: 10, p95: 20 },
      run_ms: { p50: 5, p95: 15 },
      retry_rate: 0.1,
      stalled_count: 0,
      failed_count_window: 2,
      completed_count_window: 8,
      top_errors: [],
      est_drain_ms: null,
    };
    get.mockResolvedValue({ data: stats });
    const result = await getQueueStats('send-emails');
    expect(get).toHaveBeenCalledWith('api/queues/send-emails/stats');
    expect(result).toEqual(stats);
  });

  it('encodes the queue name in the drain path', async () => {
    put.mockResolvedValue({ data: {} });
    await drainQueue('my queue');
    expect(put).toHaveBeenCalledWith('api/queues/my%20queue/drain');
  });

  it('encodes the queue name in the obliterate path', async () => {
    put.mockResolvedValue({ data: {} });
    await obliterateQueue('my queue');
    expect(put).toHaveBeenCalledWith('api/queues/my%20queue/obliterate');
  });
});
