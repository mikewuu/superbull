import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { forwardToProxy } from '../forwarding/forward-to-proxy';
import { findSourceById } from '../sources/find-source-by-id';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerGetQueueTool(server: McpServer): void {
  server.registerTool(
    'get_queue',
    {
      title: 'Get queue',
      description: 'Get one queue from a proxy source, including its current page of jobs.',
      inputSchema: {
        source_id: z.string(),
        queue_name: z.string(),
        status: z
          .string()
          .optional()
          .describe('Comma-separated job statuses to filter by, e.g. "failed,waiting".'),
        page: z.number().int().positive().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const source = await findSourceById(args.source_id);
        if (!source) {
          return errorResult('source not found');
        }

        const params = new URLSearchParams({ active_queue: args.queue_name });
        if (args.status) {
          params.set('status', args.status);
        }
        if (args.page) {
          params.set('page', String(args.page));
        }

        const result = await forwardToProxy({
          source,
          method: 'GET',
          path: ['queues'],
          search: `?${params.toString()}`,
          body: undefined,
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

function describeForwardFailure(result: { status: number; body: string }): string {
  try {
    const parsed = JSON.parse(result.body) as { error?: string };
    return parsed.error ?? `proxy returned ${result.status}`;
  } catch {
    return `proxy returned ${result.status}`;
  }
}
