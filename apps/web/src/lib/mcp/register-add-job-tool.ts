import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdForUser } from '../connectors/find-connector-by-id-for-user';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
import { describeForwardFailure } from './describe-forward-failure';
import { errorResult } from './error-result';
import { getCaller } from './get-caller';
import { jsonResult } from './json-result';

export function registerAddJobTool(server: McpServer): void {
  server.registerTool(
    'add_job',
    {
      title: 'Add job',
      description:
        'Add a job to a queue with a name and JSON data payload. Rejected on read-only queues.',
      inputSchema: {
        connector_id: z.string(),
        queue_name: z.string(),
        name: z.string().min(1).describe('The job name workers match on.'),
        data: z.unknown().describe('The job payload, any JSON value.'),
        options: z
          .object({
            delay: z
              .number()
              .int()
              .nonnegative()
              .optional()
              .describe('Milliseconds to wait before the job becomes runnable.'),
            attempts: z
              .number()
              .int()
              .positive()
              .optional()
              .describe('Total attempts before the job is marked failed.'),
            priority: z.number().int().optional().describe('Lower runs first among waiting jobs.'),
          })
          .optional(),
      },
      annotations: { destructiveHint: false },
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
          method: 'POST',
          path: ['queues', args.queue_name, 'add'],
          search: '',
          body: JSON.stringify({
            name: args.name,
            data: args.data ?? null,
            options: args.options ?? null,
          }),
          contentType: 'application/json',
        });
        if (result.status !== 201) {
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
