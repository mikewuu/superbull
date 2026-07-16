import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConnectorLegacy } from '../../src/lib/connectors/create-connector-legacy';
import { registerAddConnectorTool } from '../../src/lib/mcp/register-add-connector-tool';

vi.mock('../../src/lib/connectors/create-connector-legacy', () => ({
  createConnectorLegacy: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

interface CapturedTool {
  config: { annotations?: Record<string, unknown>; description?: string };
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

describe('registerAddConnectorTool', () => {
  it('registers a non-destructive tool that documents the stored credential', () => {
    const { server, tools } = createFakeServer();
    registerAddConnectorTool(server);

    const tool = tools.get('add_connector');
    expect(tool?.config.annotations).toMatchObject({ destructiveHint: false });
    expect(tool?.config.description).toContain('credential');
  });

  it('creates the connector and returns it without the token', async () => {
    vi.mocked(createConnectorLegacy).mockResolvedValue({
      id: 'src_1',
      workspaceId: 'ws_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      version: null,
      queues: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      created_at: new Date('2026-01-01'),
    });
    const { server, tools } = createFakeServer();
    registerAddConnectorTool(server);

    const result = await tools
      .get('add_connector')
      ?.handler({ name: 'proxy-a', url: 'https://proxy-a.example.com', token: 'secret' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(createConnectorLegacy).toHaveBeenCalledWith({
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });
    expect(body).not.toHaveProperty('token');
    expect(body.name).toBe('proxy-a');
  });

  it('returns an error result when creation fails', async () => {
    vi.mocked(createConnectorLegacy).mockRejectedValue(new Error('convex unreachable'));
    const { server, tools } = createFakeServer();
    registerAddConnectorTool(server);

    const result = await tools
      .get('add_connector')
      ?.handler({ name: 'proxy-a', url: 'https://proxy-a.example.com', token: 'secret' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('convex unreachable');
  });
});
