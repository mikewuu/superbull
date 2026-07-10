import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardToProxy } from '../../src/lib/forwarding/forward-to-proxy';
import { registerGetQueueTool } from '../../src/lib/mcp/register-get-queue-tool';
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

describe('registerGetQueueTool', () => {
  it('registers a read-only tool named get_queue', () => {
    const { server, tools } = createFakeServer();
    registerGetQueueTool(server);

    expect(tools.get('get_queue')?.config.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('forwards with active_queue/status/page query params and returns the matching queue', async () => {
    vi.mocked(findSourceById).mockResolvedValue({
      id: 'src_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      created_at: new Date(),
    });
    vi.mocked(forwardToProxy).mockResolvedValue({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        queues: [
          { name: 'other', jobs: [] },
          { name: 'jobs', jobs: [{ id: '1' }] },
        ],
      }),
    });
    const { server, tools } = createFakeServer();
    registerGetQueueTool(server);

    const result = await tools
      .get('get_queue')
      ?.handler({ source_id: 'src_1', queue_name: 'jobs', status: 'failed', page: 2 });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body.queue.name).toBe('jobs');
    const call = vi.mocked(forwardToProxy).mock.calls[0]?.[0];
    expect(call?.search).toContain('active_queue=jobs');
    expect(call?.search).toContain('status=failed');
    expect(call?.search).toContain('page=2');
  });

  it('returns an error result for an unknown source', async () => {
    vi.mocked(findSourceById).mockResolvedValue(null);
    const { server, tools } = createFakeServer();
    registerGetQueueTool(server);

    const result = await tools
      .get('get_queue')
      ?.handler({ source_id: 'missing', queue_name: 'jobs' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('source not found');
  });
});
