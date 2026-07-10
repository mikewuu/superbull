import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAddSourceTool } from '../../src/lib/mcp/register-add-source-tool';
import { createSource } from '../../src/lib/sources/create-source';

vi.mock('../../src/lib/sources/create-source', () => ({ createSource: vi.fn() }));

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

describe('registerAddSourceTool', () => {
  it('registers a non-destructive tool that documents the stored credential', () => {
    const { server, tools } = createFakeServer();
    registerAddSourceTool(server);

    const tool = tools.get('add_source');
    expect(tool?.config.annotations).toMatchObject({ destructiveHint: false });
    expect(tool?.config.description).toContain('credential');
  });

  it('creates the source and returns it without the token', async () => {
    vi.mocked(createSource).mockResolvedValue({
      id: 'src_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      created_at: new Date('2026-01-01'),
    });
    const { server, tools } = createFakeServer();
    registerAddSourceTool(server);

    const result = await tools
      .get('add_source')
      ?.handler({ name: 'proxy-a', url: 'https://proxy-a.example.com', token: 'secret' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(createSource).toHaveBeenCalledWith({
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });
    expect(body).not.toHaveProperty('token');
    expect(body.name).toBe('proxy-a');
  });

  it('returns an error result when creation fails', async () => {
    vi.mocked(createSource).mockRejectedValue(new Error('convex unreachable'));
    const { server, tools } = createFakeServer();
    registerAddSourceTool(server);

    const result = await tools
      .get('add_source')
      ?.handler({ name: 'proxy-a', url: 'https://proxy-a.example.com', token: 'secret' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('convex unreachable');
  });
});
