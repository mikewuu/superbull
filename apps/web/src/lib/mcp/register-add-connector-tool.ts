import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createConnectorLegacy } from '../connectors/create-connector-legacy';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerAddConnectorTool(server: McpServer): void {
  server.registerTool(
    'add_connector',
    {
      title: 'Add connector',
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
        const connector = await createConnectorLegacy(args);
        return jsonResult({
          id: connector.id,
          name: connector.name,
          url: connector.url,
          created_at: connector.created_at.toISOString(),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
