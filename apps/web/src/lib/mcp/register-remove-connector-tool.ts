import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { deleteConnectorLegacy } from '../connectors/delete-connector-legacy';
import { findConnectorByIdLegacy } from '../connectors/find-connector-by-id-legacy';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerRemoveConnectorTool(server: McpServer): void {
  server.registerTool(
    'remove_connector',
    {
      title: 'Remove connector',
      description: 'Delete a registered connector and its stored credential.',
      inputSchema: { connector_id: z.string() },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const connector = await findConnectorByIdLegacy(args.connector_id);
        if (!connector) {
          return errorResult('connector not found');
        }

        await deleteConnectorLegacy(args.connector_id);
        return jsonResult({ removed: true, connector_id: args.connector_id });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
