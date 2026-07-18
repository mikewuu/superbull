import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findConnectorByIdForUser } from '../../src/lib/connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../../src/lib/gateway/call-gateway-rpc';
import { registerCleanQueueTool } from '../../src/lib/mcp/register-clean-queue-tool';

vi.mock('../../src/lib/gateway/call-gateway-rpc', () => ({ callGatewayRpc: vi.fn() }));
vi.mock('../../src/lib/connectors/find-connector-by-id-for-user', () => ({
  findConnectorByIdForUser: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

interface CapturedTool {
  config: { annotations?: Record<string, unknown> };
  handler: (
    args: Record<string, unknown>,
    extra?: { authInfo?: { extra?: { userId?: string } } },
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
      tools.set(name, {
        config,
        handler: (args) => handler(args, { authInfo: { extra: { userId: 'user-1' } } }),
      });
    },
  } as unknown as McpServer;
  return { server, tools };
}

describe('registerCleanQueueTool', () => {
  it('registers a destructive tool named clean_queue', () => {
    const { server, tools } = createFakeServer();
    registerCleanQueueTool(server);

    expect(tools.get('clean_queue')?.config.annotations).toMatchObject({ destructiveHint: true });
  });

  it('PUTs the clean route with the status and reports success on 204', async () => {
    vi.mocked(findConnectorByIdForUser).mockResolvedValue({
      id: 'src_1',
      projectId: 'ws_1',
      name: 'proxy-a',
      version: null,
      queues: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      created_at: new Date(),
    });
    vi.mocked(callGatewayRpc).mockResolvedValue({ status: 204, contentType: null, body: '' });
    const { server, tools } = createFakeServer();
    registerCleanQueueTool(server);

    const result = await tools
      .get('clean_queue')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', status: 'failed' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body).toEqual({ cleaned: true, queue_name: 'jobs', status: 'failed' });
    expect(callGatewayRpc).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', path: ['queues', 'jobs', 'clean', 'failed'] }),
    );
  });

  it('returns an error result when the queue is read-only', async () => {
    vi.mocked(findConnectorByIdForUser).mockResolvedValue({
      id: 'src_1',
      projectId: 'ws_1',
      name: 'proxy-a',
      version: null,
      queues: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      created_at: new Date(),
    });
    vi.mocked(callGatewayRpc).mockResolvedValue({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'queue is read-only' }),
    });
    const { server, tools } = createFakeServer();
    registerCleanQueueTool(server);

    const result = await tools
      .get('clean_queue')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', status: 'completed' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('queue is read-only');
  });
});
