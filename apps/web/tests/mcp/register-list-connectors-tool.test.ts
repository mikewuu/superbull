import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listConnectorsForUser } from '../../src/lib/connectors/list-connectors-for-user';
import { registerListConnectorsTool } from '../../src/lib/mcp/register-list-connectors-tool';

vi.mock('../../src/lib/connectors/list-connectors-for-user', () => ({
  listConnectorsForUser: vi.fn(),
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

describe('registerListConnectorsTool', () => {
  it('registers a read-only tool named list_connectors', () => {
    const { server, tools } = createFakeServer();
    registerListConnectorsTool(server);

    const tool = tools.get('list_connectors');
    expect(tool).toBeDefined();
    expect(tool?.config.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('returns connectors without their tokens', async () => {
    vi.mocked(listConnectorsForUser).mockResolvedValue([
      {
        id: 'src_1',
        projectId: 'ws_1',
        name: 'proxy-a',
        version: null,
        queues: null,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        created_at: new Date('2026-01-01'),
      },
    ]);
    const { server, tools } = createFakeServer();
    registerListConnectorsTool(server);

    const result = await tools.get('list_connectors')?.handler({});
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(listConnectorsForUser).toHaveBeenCalledWith('user-1', null);
    expect(body.connectors).toHaveLength(1);
    expect(body.connectors[0]).not.toHaveProperty('token');
    expect(body.connectors[0].name).toBe('proxy-a');
  });
});
