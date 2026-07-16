import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdLegacy } from '../connectors/find-connector-by-id-legacy';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerRemoveJobTool(server: McpServer): void {
  server.registerTool(
    'remove_job',
    {
      title: 'Remove job',
      description: 'Permanently delete one job from a queue. Rejected on read-only queues.',
      inputSchema: { connector_id: z.string(), queue_name: z.string(), job_id: z.string() },
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
          path: ['queues', args.queue_name, args.job_id, 'clean'],
          search: '',
          body: null,
          contentType: null,
        });
        if (result.status !== 204) {
          return errorResult(describeForwardFailure(result));
        }

        return jsonResult({ removed: true, job_id: args.job_id });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
