import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { forwardToProxy } from '../forwarding/forward-to-proxy';
import { findSourceById } from '../sources/find-source-by-id';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

export function registerResumeQueueTool(server: McpServer): void {
  server.registerTool(
    'resume_queue',
    {
      title: 'Resume queue',
      description: 'Resume a paused queue on a proxy source.',
      inputSchema: { source_id: z.string(), queue_name: z.string() },
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
          path: ['queues', args.queue_name, 'resume'],
          search: '',
          body: undefined,
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

function describeForwardFailure(result: { status: number; body: string }): string {
  try {
    const parsed = JSON.parse(result.body) as { error?: string };
    return parsed.error ?? `proxy returned ${result.status}`;
  } catch {
    return `proxy returned ${result.status}`;
  }
}
