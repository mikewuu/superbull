import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findConnectorByIdForUser } from '../../src/lib/connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../../src/lib/gateway/call-gateway-rpc';
import { registerGetJobTool } from '../../src/lib/mcp/register-get-job-tool';

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

describe('registerGetJobTool', () => {
  it('registers a read-only tool named get_job', () => {
    const { server, tools } = createFakeServer();
    registerGetJobTool(server);

    expect(tools.get('get_job')?.config.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('GETs the job route and returns the job with its state', async () => {
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
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job: { id: '42', name: 'send-welcome', failed_reason: 'boom', stacktrace: ['Error: boom'] },
        status: 'failed',
      }),
    });
    const { server, tools } = createFakeServer();
    registerGetJobTool(server);

    const result = await tools
      .get('get_job')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', job_id: '42' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body.job.id).toBe('42');
    expect(body.status).toBe('failed');
    expect(callGatewayRpc).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: ['queues', 'jobs', '42'] }),
    );
  });

  it('returns an error result when the job is missing', async () => {
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
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'job not found' }),
    });
    const { server, tools } = createFakeServer();
    registerGetJobTool(server);

    const result = await tools
      .get('get_job')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', job_id: 'missing' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('job not found');
  });
});
