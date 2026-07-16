import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdLegacy } from '../connectors/find-connector-by-id-legacy';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerResumeQueueTool(server: McpServer): void {
  server.registerTool(
    'resume_queue',
    {
      title: 'Resume queue',
      description: 'Resume a paused queue on a connector.',
      inputSchema: { connector_id: z.string(), queue_name: z.string() },
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
          path: ['queues', args.queue_name, 'resume'],
          search: '',
          body: null,
          contentType: null,
        });
        if (result.status !== 204) {
          return errorResult(describeForwardFailure(result));
        }

        return jsonResult({ resumed: true, queue_name: args.queue_name });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
