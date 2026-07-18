import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdForUser } from '../connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
import { jsonResult } from './json-result';

export function registerGetJobTool(server: McpServer): void {
  server.registerTool(
    'get_job',
    {
      title: 'Get job',
      description:
        'Get one job from a queue: its data, options, progress, attempts, failure reason, stack trace, return value, and timestamps.',
      inputSchema: { connector_id: z.string(), queue_name: z.string(), job_id: z.string() },
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
          path: ['queues', args.queue_name, args.job_id],
          search: '',
          body: null,
          contentType: null,
        });
        if (result.status !== 200) {
          return errorResult(describeForwardFailure(result));
        }

        const parsed = JSON.parse(result.body) as { job: unknown; status: string };
        return jsonResult({ job: parsed.job, status: parsed.status });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
