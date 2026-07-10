import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardToProxy } from '../../src/lib/forwarding/forward-to-proxy';
import { registerRetryJobTool } from '../../src/lib/mcp/register-retry-job-tool';
import { findSourceById } from '../../src/lib/sources/find-source-by-id';

vi.mock('../../src/lib/forwarding/forward-to-proxy', () => ({ forwardToProxy: vi.fn() }));
vi.mock('../../src/lib/sources/find-source-by-id', () => ({ findSourceById: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

interface CapturedTool {
  config: { annotations?: Record<string, unknown> };
  handler: (
    args: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
}

function createFakeServer() {
  const tools = new Map<string, CapturedTool>();
  const server = {
    registerTool: (
      name: string,
      config: CapturedTool['config'],
      handler: CapturedTool['handler'],
    ) => {
      tools.set(name, { config, handler });
    },
  } as unknown as McpServer;
  return { server, tools };
}

describe('registerRetryJobTool', () => {
  it('registers a destructive tool named retry_job', () => {
    const { server, tools } = createFakeServer();
    registerRetryJobTool(server);

    expect(tools.get('retry_job')?.config.annotations).toMatchObject({ destructiveHint: true });
  });

  it('PUTs the retry route and reports success on 204', async () => {
    vi.mocked(findSourceById).mockResolvedValue({
      id: 'src_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      created_at: new Date(),
    });
    vi.mocked(forwardToProxy).mockResolvedValue({ status: 204, contentType: null, body: '' });
    const { server, tools } = createFakeServer();
    registerRetryJobTool(server);

    const result = await tools
      .get('retry_job')
      ?.handler({ source_id: 'src_1', queue_name: 'jobs', job_id: '42' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body).toEqual({ retried: true, job_id: '42' });
    expect(forwardToProxy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', path: ['queues', 'jobs', '42', 'retry'] }),
    );
  });

  it('returns an error result when the proxy rejects the retry', async () => {
    vi.mocked(findSourceById).mockResolvedValue({
      id: 'src_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      created_at: new Date(),
    });
    vi.mocked(forwardToProxy).mockResolvedValue({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'job not found' }),
    });
    const { server, tools } = createFakeServer();
    registerRetryJobTool(server);

    const result = await tools
      .get('retry_job')
      ?.handler({ source_id: 'src_1', queue_name: 'jobs', job_id: '42' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('job not found');
  });
});
