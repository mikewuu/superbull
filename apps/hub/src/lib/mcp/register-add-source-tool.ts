import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createSource } from '../sources/create-source';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerAddSourceTool(server: McpServer): void {
  server.registerTool(
    'add_source',
    {
      title: 'Add source',
      description:
        'Register a remote superbull proxy with the hub. Stores the bearer token as a credential. The token is never returned by this or any other tool.',
      inputSchema: {
        name: z.string().min(1),
        url: z.string().url(),
        token: z
          .string()
          .min(1)
          .describe('The bearer token the proxy was started with (its startProxy token).'),
      },
      annotations: { destructiveHint: false },
    },
    async (args) => {
      try {
        const source = await createSource(args);
        return jsonResult({
          id: source.id,
          name: source.name,
          url: source.url,
          created_at: source.created_at.toISOString(),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
