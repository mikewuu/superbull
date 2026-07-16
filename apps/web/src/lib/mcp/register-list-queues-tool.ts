import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { forwardToProxy } from '../forwarding/forward-to-proxy';
import { findSourceById } from '../sources/find-source-by-id';
import { errorResult } from './error-result';
import { jsonResult } from './json-result';

interface ForwardedQueue {
  name: string;
  counts: Record<string, number>;
  is_paused: boolean;
}

export function registerListQueuesTool(server: McpServer): void {
  server.registerTool(
    'list_queues',
    {
      title: 'List queues',
      description: 'List the queues a proxy source exposes, with job counts and paused state.',
      inputSchema: { source_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const source = await findSourceById(args.source_id);
        if (!source) {
          return errorResult('source not found');
        }

        const result = await forwardToProxy({
          source,
          method: 'GET',
          path: ['queues'],
          search: '',
          body: undefined,
          contentType: null,
        });
        if (result.status !== 200) {
          return errorResult(describeForwardFailure(result));
        }

        const parsed = JSON.parse(result.body) as { queues: ForwardedQueue[] };
        return jsonResult({
          queues: parsed.queues.map((queue) => ({
            name: queue.name,
            counts: queue.counts,
            is_paused: queue.is_paused,
          })),
        });
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
