import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { forwardToProxy } from '../forwarding/forward-to-proxy';
import { findSourceById } from '../sources/find-source-by-id';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerRetryJobTool(server: McpServer): void {
  server.registerTool(
    'retry_job',
    {
      title: 'Retry job',
      description: 'Retry a failed or completed job on a proxy source.',
      inputSchema: { source_id: z.string(), queue_name: z.string(), job_id: z.string() },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const source = await findSourceById(args.source_id);
        if (!source) {
          return errorResult('source not found');
        }

        const result = await forwardToProxy({
          source,
          method: 'PUT',
          path: ['queues', args.queue_name, args.job_id, 'retry'],
          search: '',
          body: undefined,
          contentType: null,
        });
        if (result.status !== 204) {
          return errorResult(describeForwardFailure(result));
        }

        return jsonResult({ retried: true, job_id: args.job_id });
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
