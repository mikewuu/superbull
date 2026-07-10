import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerListSourcesTool } from '../../src/lib/mcp/register-list-sources-tool';
import { listSources } from '../../src/lib/sources/list-sources';

vi.mock('../../src/lib/sources/list-sources', () => ({ listSources: vi.fn() }));

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

describe('registerListSourcesTool', () => {
  it('registers a read-only tool named list_sources', () => {
    const { server, tools } = createFakeServer();
    registerListSourcesTool(server);

    const tool = tools.get('list_sources');
    expect(tool).toBeDefined();
    expect(tool?.config.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('returns sources without their tokens', async () => {
    vi.mocked(listSources).mockResolvedValue([
      {
        id: 'src_1',
        name: 'proxy-a',
        url: 'https://proxy-a.example.com',
        token: 'secret',
        created_at: new Date('2026-01-01'),
      },
    ]);
    const { server, tools } = createFakeServer();
    registerListSourcesTool(server);

    const result = await tools.get('list_sources')?.handler({});
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).not.toHaveProperty('token');
    expect(body.sources[0].name).toBe('proxy-a');
  });
});
