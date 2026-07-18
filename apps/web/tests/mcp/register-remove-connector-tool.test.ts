import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteConnectorForUser } from '../../src/lib/connectors/delete-connector-for-user';
import { registerRemoveConnectorTool } from '../../src/lib/mcp/register-remove-connector-tool';

vi.mock('../../src/lib/connectors/delete-connector-for-user', () => ({
  deleteConnectorForUser: vi.fn(),
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

describe('registerRemoveConnectorTool', () => {
  it('registers a destructive tool named remove_connector', () => {
    const { server, tools } = createFakeServer();
    registerRemoveConnectorTool(server);

    expect(tools.get('remove_connector')?.config.annotations).toMatchObject({
      destructiveHint: true,
    });
  });

  it('deletes an existing connector', async () => {
    vi.mocked(deleteConnectorForUser).mockResolvedValue();
    const { server, tools } = createFakeServer();
    registerRemoveConnectorTool(server);

    const result = await tools.get('remove_connector')?.handler({ connector_id: 'src_1' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(deleteConnectorForUser).toHaveBeenCalledWith({
      userId: 'user-1',
      connectorId: 'src_1',
      requiredProjectId: null,
    });
    expect(body).toEqual({ removed: true, connector_id: 'src_1' });
  });

  it('returns an error result for an unknown connector without deleting anything', async () => {
    vi.mocked(deleteConnectorForUser).mockRejectedValue(new Error('Connector not found'));
    const { server, tools } = createFakeServer();
    registerRemoveConnectorTool(server);

    const result = await tools.get('remove_connector')?.handler({ connector_id: 'missing' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('Connector not found');
    expect(deleteConnectorForUser).toHaveBeenCalledWith({
      userId: 'user-1',
      connectorId: 'missing',
      requiredProjectId: null,
    });
  });
});
