import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listConnectorsLegacy } from '../connectors/list-connectors-legacy';
import type { Connector } from '../connectors/types';
import { getConnectorStatusFromGateway } from '../gateway/get-connector-status';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

// TODO(7.2e): the global SUPERBULL_API_TOKEN currently lists connectors
// across every workspace on the deployment (matching the pre-multi-tenant
// hub API). Pending the owner's auth-model decision, MCP auth should move to
// per-workspace API keys and scope this listing accordingly.
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
          connectors: await Promise.all(
            connectors.map(async (connector) => ({
              id: connector.id,
              name: connector.name,
              is_connected: await isConnected(connector),
              created_at: connector.created_at.toISOString(),
            })),
          ),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

// Same derivation as the connectors page: the gateway's live session
// registry is the source of truth; the Convex connection stamps are only a
// fallback for when the gateway is unreachable (a dead gateway never runs
// markDisconnected, so stamps alone would report stale-online forever).
async function isConnected(connector: Connector): Promise<boolean> {
  const live = await getConnectorStatusFromGateway(connector.id);
  if (live) {
    return live.connected;
  }
  return (
    connector.lastConnectedAt !== null &&
    (connector.lastDisconnectedAt === null ||
      connector.lastDisconnectedAt < connector.lastConnectedAt)
  );
}
