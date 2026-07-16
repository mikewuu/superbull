import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findConnectorByIdLegacy } from '../../src/lib/connectors/find-connector-by-id-legacy';
import { callGatewayRpc } from '../../src/lib/gateway/call-gateway-rpc';
import { registerResumeQueueTool } from '../../src/lib/mcp/register-resume-queue-tool';

vi.mock('../../src/lib/gateway/call-gateway-rpc', () => ({ callGatewayRpc: vi.fn() }));
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

describe('registerResumeQueueTool', () => {
  it('registers a destructive tool named resume_queue', () => {
    const { server, tools } = createFakeServer();
    registerResumeQueueTool(server);

    expect(tools.get('resume_queue')?.config.annotations).toMatchObject({
      destructiveHint: true,
    });
  });

  it('PUTs the resume route and reports success on 204', async () => {
    vi.mocked(findConnectorByIdLegacy).mockResolvedValue({
      id: 'src_1',
      workspaceId: 'ws_1',
      name: 'proxy-a',
      version: null,
      queues: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      created_at: new Date(),
    });
    vi.mocked(callGatewayRpc).mockResolvedValue({ status: 204, contentType: null, body: '' });
    const { server, tools } = createFakeServer();
    registerResumeQueueTool(server);

    const result = await tools
      .get('resume_queue')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body).toEqual({ resumed: true, queue_name: 'jobs' });
    expect(callGatewayRpc).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', path: ['queues', 'jobs', 'resume'] }),
    );
  });

  it('returns an error result for an unknown source', async () => {
    vi.mocked(findConnectorByIdLegacy).mockResolvedValue(null);
    const { server, tools } = createFakeServer();
    registerResumeQueueTool(server);

    const result = await tools
      .get('resume_queue')
      ?.handler({ connector_id: 'missing', queue_name: 'jobs' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('connector not found');
  });
});
