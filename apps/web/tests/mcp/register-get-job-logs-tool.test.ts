import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findConnectorByIdLegacy } from '../../src/lib/connectors/find-connector-by-id-legacy';
import { forwardToProxy } from '../../src/lib/forwarding/forward-to-proxy';
import { registerGetJobLogsTool } from '../../src/lib/mcp/register-get-job-logs-tool';

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

describe('registerGetJobLogsTool', () => {
  it('registers a read-only tool named get_job_logs', () => {
    const { server, tools } = createFakeServer();
    registerGetJobLogsTool(server);

    expect(tools.get('get_job_logs')?.config.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('GETs the logs route and returns the log lines', async () => {
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
      body: JSON.stringify({ logs: ['starting', 'sending to smtp'] }),
    });
    const { server, tools } = createFakeServer();
    registerGetJobLogsTool(server);

    const result = await tools
      .get('get_job_logs')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', job_id: '42' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body.logs).toEqual(['starting', 'sending to smtp']);
    expect(forwardToProxy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: ['queues', 'jobs', '42', 'logs'] }),
    );
  });

  it('returns an error result for an unknown source', async () => {
    vi.mocked(findConnectorByIdLegacy).mockResolvedValue(null);
    const { server, tools } = createFakeServer();
    registerGetJobLogsTool(server);

    const result = await tools
      .get('get_job_logs')
      ?.handler({ connector_id: 'missing', queue_name: 'jobs', job_id: '42' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('connector not found');
  });
});
