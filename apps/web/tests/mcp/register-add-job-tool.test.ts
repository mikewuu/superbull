import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findConnectorByIdLegacy } from '../../src/lib/connectors/find-connector-by-id-legacy';
import { callGatewayRpc } from '../../src/lib/gateway/call-gateway-rpc';
import { registerAddJobTool } from '../../src/lib/mcp/register-add-job-tool';

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

describe('registerAddJobTool', () => {
  it('registers a non-destructive tool named add_job', () => {
    const { server, tools } = createFakeServer();
    registerAddJobTool(server);

    expect(tools.get('add_job')?.config.annotations).toMatchObject({ destructiveHint: false });
  });

  it('POSTs the add route with a JSON body and returns the created job on 201', async () => {
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
    vi.mocked(callGatewayRpc).mockResolvedValue({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ job: { id: '99', name: 'send-welcome' }, status: 'waiting' }),
    });
    const { server, tools } = createFakeServer();
    registerAddJobTool(server);

    const result = await tools.get('add_job')?.handler({
      connector_id: 'src_1',
      queue_name: 'jobs',
      name: 'send-welcome',
      data: { to: 'user@example.com' },
      options: { delay: 1000, attempts: 3 },
    });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body.job.id).toBe('99');
    expect(body.status).toBe('waiting');
    const call = vi.mocked(callGatewayRpc).mock.calls[0]?.[0];
    expect(call?.method).toBe('POST');
    expect(call?.path).toEqual(['queues', 'jobs', 'add']);
    expect(call?.contentType).toBe('application/json');
    expect(JSON.parse(call?.body ?? '{}')).toEqual({
      name: 'send-welcome',
      data: { to: 'user@example.com' },
      options: { delay: 1000, attempts: 3 },
    });
  });

  it('returns an error result when the queue is read-only', async () => {
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
    vi.mocked(callGatewayRpc).mockResolvedValue({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'queue is read-only' }),
    });
    const { server, tools } = createFakeServer();
    registerAddJobTool(server);

    const result = await tools
      .get('add_job')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', name: 'send-welcome', data: {} });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('queue is read-only');
  });
});
