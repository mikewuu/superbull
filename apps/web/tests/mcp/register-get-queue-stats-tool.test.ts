import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findConnectorByIdLegacy } from '../../src/lib/connectors/find-connector-by-id-legacy';
import { forwardToProxy } from '../../src/lib/forwarding/forward-to-proxy';
import { registerGetQueueStatsTool } from '../../src/lib/mcp/register-get-queue-stats-tool';

vi.mock('../../src/lib/forwarding/forward-to-proxy', () => ({ forwardToProxy: vi.fn() }));
vi.mock('../../src/lib/connectors/find-connector-by-id-legacy', () => ({
  findConnectorByIdLegacy: vi.fn(),
}));

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

describe('registerGetQueueStatsTool', () => {
  it('registers a read-only tool named get_queue_stats', () => {
    const { server, tools } = createFakeServer();
    registerGetQueueStatsTool(server);

    expect(tools.get('get_queue_stats')?.config.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('GETs the stats route and returns the stats payload', async () => {
    vi.mocked(findConnectorByIdLegacy).mockResolvedValue({
      id: 'src_1',
      workspaceId: 'ws_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      version: null,
      queues: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      created_at: new Date(),
    });
    vi.mocked(forwardToProxy).mockResolvedValue({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        wait_ms: { p50: 120, p95: 900 },
        run_ms: { p50: 40, p95: 300 },
        retry_rate: 0.02,
        stalled_count: 0,
        failed_count_window: 3,
        completed_count_window: 128,
        top_errors: [{ message: 'connect ECONNREFUSED', count: 3 }],
        est_drain_ms: 42000,
      }),
    });
    const { server, tools } = createFakeServer();
    registerGetQueueStatsTool(server);

    const result = await tools
      .get('get_queue_stats')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body.stats.wait_ms).toEqual({ p50: 120, p95: 900 });
    expect(body.stats.top_errors[0]?.count).toBe(3);
    expect(forwardToProxy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: ['queues', 'jobs', 'stats'] }),
    );
  });

  it('returns an error result when the proxy rejects the request', async () => {
    vi.mocked(findConnectorByIdLegacy).mockResolvedValue({
      id: 'src_1',
      workspaceId: 'ws_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      version: null,
      queues: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      created_at: new Date(),
    });
    vi.mocked(forwardToProxy).mockResolvedValue({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'queue not found' }),
    });
    const { server, tools } = createFakeServer();
    registerGetQueueStatsTool(server);

    const result = await tools
      .get('get_queue_stats')
      ?.handler({ connector_id: 'src_1', queue_name: 'missing' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('queue not found');
  });
});
