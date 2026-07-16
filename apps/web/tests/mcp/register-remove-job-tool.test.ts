import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findConnectorByIdLegacy } from '../../src/lib/connectors/find-connector-by-id-legacy';
import { forwardToProxy } from '../../src/lib/forwarding/forward-to-proxy';
import { registerRemoveJobTool } from '../../src/lib/mcp/register-remove-job-tool';

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

describe('registerRemoveJobTool', () => {
  it('registers a destructive tool named remove_job', () => {
    const { server, tools } = createFakeServer();
    registerRemoveJobTool(server);

    expect(tools.get('remove_job')?.config.annotations).toMatchObject({ destructiveHint: true });
  });

  it('PUTs the clean route and reports success on 204', async () => {
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
    vi.mocked(forwardToProxy).mockResolvedValue({ status: 204, contentType: null, body: '' });
    const { server, tools } = createFakeServer();
    registerRemoveJobTool(server);

    const result = await tools
      .get('remove_job')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', job_id: '42' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body).toEqual({ removed: true, job_id: '42' });
    expect(forwardToProxy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', path: ['queues', 'jobs', '42', 'clean'] }),
    );
  });

  it('returns an error result when the job is missing', async () => {
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
      body: JSON.stringify({ error: 'job not found' }),
    });
    const { server, tools } = createFakeServer();
    registerRemoveJobTool(server);

    const result = await tools
      .get('remove_job')
      ?.handler({ connector_id: 'src_1', queue_name: 'jobs', job_id: 'missing' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('job not found');
  });
});
