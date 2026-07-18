import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdForUser } from '../connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
import { jsonResult } from './json-result';

interface ForwardedQueue {
  name: string;
  counts: Record<string, number>;
  is_paused: boolean;
}

export function registerListQueuesTool(server: McpServer): void {
  server.registerTool(
    'list_queues',
    {
      title: 'List queues',
      description: 'List the queues a connector exposes, with job counts and paused state.',
      inputSchema: { connector_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      try {
        const caller = getCaller(extra.authInfo);
        const connector = await findConnectorByIdForUser({
          userId: caller.userId,
          connectorId: args.connector_id,
          requiredProjectId: caller.projectId,
        });
        if (!connector) {
          return errorResult('connector not found');
        }

        const result = await callGatewayRpc({
          connectorId: connector.id,
          method: 'GET',
          path: ['queues'],
          search: '',
          body: null,
          contentType: null,
        });
        if (result.status !== 200) {
          return errorResult(describeForwardFailure(result));
        }

        const parsed = JSON.parse(result.body) as { queues: ForwardedQueue[] };
        return jsonResult({
          queues: parsed.queues.map((queue) => ({
            name: queue.name,
            counts: queue.counts,
            is_paused: queue.is_paused,
          })),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
