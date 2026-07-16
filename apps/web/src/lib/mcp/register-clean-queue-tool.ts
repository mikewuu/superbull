import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdLegacy } from '../connectors/find-connector-by-id-legacy';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerCleanQueueTool(server: McpServer): void {
  server.registerTool(
    'clean_queue',
    {
      title: 'Clean queue',
      description:
        'Bulk-delete jobs in one status of a queue (completed, wait, active, delayed, or failed); jobs newer than a 5-second grace window are kept. Rejected on read-only queues.',
      inputSchema: {
        connector_id: z.string(),
        queue_name: z.string(),
        status: z
          .enum(['completed', 'wait', 'active', 'delayed', 'failed'])
          .describe('The job status to clean out.'),
      },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const connector = await findConnectorByIdLegacy(args.connector_id);
        if (!connector) {
          return errorResult('connector not found');
        }

        const result = await callGatewayRpc({
          connectorId: connector.id,
          method: 'PUT',
          path: ['queues', args.queue_name, 'clean', args.status],
          search: '',
          body: null,
          contentType: null,
        });
        if (result.status !== 204) {
          return errorResult(describeForwardFailure(result));
        }

        return jsonResult({ cleaned: true, queue_name: args.queue_name, status: args.status });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
