import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listConnectorsLegacy } from '../connectors/list-connectors-legacy';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

// TODO(round-3+): the global SUPERBULL_API_TOKEN currently lists connectors
// across every workspace on the deployment (matching the pre-multi-tenant
// hub API). Round 3+ should switch MCP auth to per-workspace API keys and
// scope this listing accordingly.
export function registerListConnectorsTool(server: McpServer): void {
  server.registerTool(
    'list_connectors',
    {
      title: 'List connectors',
      description: 'List every connector the hub federates, without their bearer tokens.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const connectors = await listConnectorsLegacy();
        return jsonResult({
          connectors: connectors.map((connector) => ({
            id: connector.id,
            name: connector.name,
            url: connector.url,
            created_at: connector.created_at.toISOString(),
          })),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
