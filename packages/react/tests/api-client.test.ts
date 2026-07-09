import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, put, post } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: () => ({ get, put, post }) },
}));

import { applyBulkJobAction, getQueues, retryJob } from '../src/lib/api-client';

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
});
