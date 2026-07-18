import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdForUser } from '../connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
import { jsonResult } from './json-result';

export function registerGetQueueStatsTool(server: McpServer): void {
  server.registerTool(
    'get_queue_stats',
    {
      title: 'Get queue stats',
      description:
        'Get diagnostic stats for a queue: p50/p95 wait and run times, retry rate, stalled count, recent completed/failed counts, top error messages, and estimated drain time.',
      inputSchema: { connector_id: z.string(), queue_name: z.string() },
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
          path: ['queues', args.queue_name, 'stats'],
          search: '',
          body: null,
          contentType: null,
        });
        if (result.status !== 200) {
          return errorResult(describeForwardFailure(result));
        }

        const parsed = JSON.parse(result.body) as Record<string, unknown>;
        return jsonResult({ stats: parsed });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
