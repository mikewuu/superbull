import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerRemoveSourceTool } from '../../src/lib/mcp/register-remove-source-tool';
import { deleteSource } from '../../src/lib/sources/delete-source';
import { findSourceById } from '../../src/lib/sources/find-source-by-id';

vi.mock('../../src/lib/sources/delete-source', () => ({ deleteSource: vi.fn() }));
vi.mock('../../src/lib/sources/find-source-by-id', () => ({ findSourceById: vi.fn() }));

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

describe('registerRemoveSourceTool', () => {
  it('registers a destructive tool named remove_source', () => {
    const { server, tools } = createFakeServer();
    registerRemoveSourceTool(server);

    expect(tools.get('remove_source')?.config.annotations).toMatchObject({
      destructiveHint: true,
    });
  });

  it('deletes an existing source', async () => {
    vi.mocked(findSourceById).mockResolvedValue({
      id: 'src_1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
      created_at: new Date(),
    });
    const { server, tools } = createFakeServer();
    registerRemoveSourceTool(server);

    const result = await tools.get('remove_source')?.handler({ source_id: 'src_1' });
    const body = JSON.parse(result?.content[0]?.text ?? '{}');

    expect(deleteSource).toHaveBeenCalledWith('src_1');
    expect(body).toEqual({ removed: true, source_id: 'src_1' });
  });

  it('returns an error result for an unknown source without deleting anything', async () => {
    vi.mocked(findSourceById).mockResolvedValue(null);
    const { server, tools } = createFakeServer();
    registerRemoveSourceTool(server);

    const result = await tools.get('remove_source')?.handler({ source_id: 'missing' });

    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toContain('source not found');
    expect(deleteSource).not.toHaveBeenCalled();
  });
});
