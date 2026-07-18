import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdForUser } from '../connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
import { jsonResult } from './json-result';

export function registerGetQueueTool(server: McpServer): void {
  server.registerTool(
    'get_queue',
    {
      title: 'Get queue',
      description: 'Get one queue from a connector, including its current page of jobs.',
      inputSchema: {
        connector_id: z.string(),
        queue_name: z.string(),
        status: z
          .string()
          .optional()
          .describe('Comma-separated job statuses to filter by, e.g. "failed,waiting".'),
        page: z.number().int().positive().optional(),
      },
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

        const params = new URLSearchParams({ active_queue: args.queue_name });
        if (args.status) {
          params.set('status', args.status);
        }
        if (args.page) {
          params.set('page', String(args.page));
        }

        const result = await callGatewayRpc({
          connectorId: connector.id,
          method: 'GET',
          path: ['queues'],
          search: `?${params.toString()}`,
          body: null,
          contentType: null,
        });
        if (result.status !== 200) {
          return errorResult(describeForwardFailure(result));
        }

        const parsed = JSON.parse(result.body) as { queues: Array<{ name: string }> };
        const queue = parsed.queues.find((candidate) => candidate.name === args.queue_name);
        if (!queue) {
          return errorResult(`queue "${args.queue_name}" not found`);
        }

        return jsonResult({ queue });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
