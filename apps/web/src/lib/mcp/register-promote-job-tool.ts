import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdForUser } from '../connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
import { jsonResult } from './json-result';

export function registerPromoteJobTool(server: McpServer): void {
  server.registerTool(
    'promote_job',
    {
      title: 'Promote job',
      description:
        'Promote a delayed job so it becomes runnable now instead of waiting out its delay. Rejected on read-only queues.',
      inputSchema: { connector_id: z.string(), queue_name: z.string(), job_id: z.string() },
      annotations: { destructiveHint: true },
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
          method: 'PUT',
          path: ['queues', args.queue_name, args.job_id, 'promote'],
          search: '',
          body: null,
          contentType: null,
        });
        if (result.status !== 204) {
          return errorResult(describeForwardFailure(result));
        }

        return jsonResult({ promoted: true, job_id: args.job_id });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
