import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findConnectorByIdLegacy } from '../connectors/find-connector-by-id-legacy';
import { callGatewayRpc } from '../gateway/call-gateway-rpc';
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
      description: 'List the queues a connector exposes, with job counts and paused state.',
      inputSchema: { connector_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const connector = await findConnectorByIdLegacy(args.connector_id);
        if (!connector) {
          return errorResult('connector not found');
        }

        const result = await callGatewayRpc({
          connectorId: connector.id,
          method: 'GET',
          path: ['queues'],
          search: '',
          body: null,
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
    return parsed.error ?? `connector returned ${result.status}`;
  } catch {
    return `connector returned ${result.status}`;
  }
}
