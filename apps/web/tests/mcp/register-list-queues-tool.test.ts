import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardToProxy } from '../../src/lib/forwarding/forward-to-proxy';
import { registerListQueuesTool } from '../../src/lib/mcp/register-list-queues-tool';
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

describe('registerListQueuesTool', () => {
  it('registers a read-only tool named list_queues', () => {
    const { server, tools } = createFakeServer();
    registerListQueuesTool(server);

    expect(tools.get('list_queues')?.config.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('forwards to the proxy and returns a name/counts/is_paused summary', async () => {
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
        queues: [{ name: 'jobs', counts: { waiting: 2 }, is_paused: false, jobs: [] }],
      }),
    });
    const { server, tools } = createFakeServer();
    registerListQueuesTool(server);

    const result = await tools.get('list_queues')?.handler({ source_id: 'src_1' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body.queues).toEqual([{ name: 'jobs', counts: { waiting: 2 }, is_paused: false }]);
    expect(forwardToProxy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: ['queues'] }),
    );
  });

  it('returns an error result for an unknown source', async () => {
    vi.mocked(findSourceById).mockResolvedValue(null);
    const { server, tools } = createFakeServer();
    registerListQueuesTool(server);

    const result = await tools.get('list_queues')?.handler({ source_id: 'missing' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('source not found');
    expect(forwardToProxy).not.toHaveBeenCalled();
  });
});
