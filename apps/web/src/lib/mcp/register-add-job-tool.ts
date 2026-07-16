import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdLegacy } from '../connectors/find-connector-by-id-legacy';
import { forwardToProxy } from '../forwarding/forward-to-proxy';
import { errorResult } from './error-result';
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
            delay: z.number().int().nonnegative().optional().describe('Milliseconds to wait before the job becomes runnable.'),
            attempts: z.number().int().positive().optional().describe('Total attempts before the job is marked failed.'),
            priority: z.number().int().optional().describe('Lower runs first among waiting jobs.'),
          })
          .optional(),
      },
      annotations: { destructiveHint: false },
    },
    async (args) => {
      try {
        const connector = await findConnectorByIdLegacy(args.connector_id);
        if (!connector || !connector.url || !connector.token) {
          return errorResult('connector not found');
        }

        const result = await forwardToProxy({
          connector: { url: connector.url, token: connector.token },
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

function describeForwardFailure(result: { status: number; body: string }): string {
  try {
    const parsed = JSON.parse(result.body) as { error?: string };
    return parsed.error ?? `proxy returned ${result.status}`;
  } catch {
    return `proxy returned ${result.status}`;
  }
}
