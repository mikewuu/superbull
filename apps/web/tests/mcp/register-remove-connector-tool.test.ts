import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteConnectorLegacy } from '../../src/lib/connectors/delete-connector-legacy';
import { findConnectorByIdLegacy } from '../../src/lib/connectors/find-connector-by-id-legacy';
import { registerRemoveConnectorTool } from '../../src/lib/mcp/register-remove-connector-tool';

vi.mock('../../src/lib/connectors/delete-connector-legacy', () => ({
  deleteConnectorLegacy: vi.fn(),
}));
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

describe('registerRemoveConnectorTool', () => {
  it('registers a destructive tool named remove_connector', () => {
    const { server, tools } = createFakeServer();
    registerRemoveConnectorTool(server);

    expect(tools.get('remove_connector')?.config.annotations).toMatchObject({
      destructiveHint: true,
    });
  });

  it('deletes an existing connector', async () => {
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
    const { server, tools } = createFakeServer();
    registerRemoveConnectorTool(server);

    const result = await tools.get('remove_connector')?.handler({ connector_id: 'src_1' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(deleteConnectorLegacy).toHaveBeenCalledWith('src_1');
    expect(body).toEqual({ removed: true, connector_id: 'src_1' });
  });

  it('returns an error result for an unknown connector without deleting anything', async () => {
    vi.mocked(findConnectorByIdLegacy).mockResolvedValue(null);
    const { server, tools } = createFakeServer();
    registerRemoveConnectorTool(server);

    const result = await tools.get('remove_connector')?.handler({ connector_id: 'missing' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('connector not found');
    expect(deleteConnectorLegacy).not.toHaveBeenCalled();
  });
});
