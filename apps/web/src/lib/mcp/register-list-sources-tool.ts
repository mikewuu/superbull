import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listSources } from '../sources/list-sources';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerListSourcesTool(server: McpServer): void {
  server.registerTool(
    'list_sources',
    {
      title: 'List sources',
      description: 'List every proxy source the hub federates, without their bearer tokens.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const sources = await listSources();
        return jsonResult({
          sources: sources.map((source) => ({
            id: source.id,
            name: source.name,
            url: source.url,
            created_at: source.created_at.toISOString(),
          })),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
