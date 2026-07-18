import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { deleteConnectorForUser } from '../connectors/delete-connector-for-user';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
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
    async (args, extra) => {
      try {
        const caller = getCaller(extra.authInfo);
        await deleteConnectorForUser({
          userId: caller.userId,
          connectorId: args.connector_id,
          requiredProjectId: caller.projectId,
        });
        return jsonResult({ removed: true, connector_id: args.connector_id });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
