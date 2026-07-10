import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { deleteSource } from '../sources/delete-source';
import { findSourceById } from '../sources/find-source-by-id';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerRemoveSourceTool(server: McpServer): void {
  server.registerTool(
    'remove_source',
    {
      title: 'Remove source',
      description: 'Remove a proxy source the hub federates.',
      inputSchema: { source_id: z.string() },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const source = await findSourceById(args.source_id);
        if (!source) {
          return errorResult('source not found');
        }

        await deleteSource(args.source_id);
        return jsonResult({ removed: true, source_id: args.source_id });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
