import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listConnectorsForUser } from '../connectors/list-connectors-for-user';
import type { Connector } from '../connectors/types';
import { getConnectorStatusFromGateway } from '../gateway/get-connector-status';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
import { jsonResult } from './json-result';

export function registerListConnectorsTool(server: McpServer): void {
  server.registerTool(
    'list_connectors',
    {
      title: 'List connectors',
      description: 'List every connector in your projects, without their bearer tokens.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async (_args, extra) => {
      try {
        const caller = getCaller(extra.authInfo);
        const connectors = await listConnectorsForUser(caller.userId, caller.projectId);
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
