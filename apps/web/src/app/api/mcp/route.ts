import { timingSafeEqual } from 'node:crypto';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { env } from '../../../lib/config/env';
import { registerGetQueueTool } from '../../../lib/mcp/register-get-queue-tool';
import { registerListConnectorsTool } from '../../../lib/mcp/register-list-connectors-tool';
import { registerListQueuesTool } from '../../../lib/mcp/register-list-queues-tool';
import { registerPauseQueueTool } from '../../../lib/mcp/register-pause-queue-tool';
import { registerRemoveConnectorTool } from '../../../lib/mcp/register-remove-connector-tool';
import { registerResumeQueueTool } from '../../../lib/mcp/register-resume-queue-tool';
import { registerRetryJobTool } from '../../../lib/mcp/register-retry-job-tool';

// TODO(7.2e): list_connectors/remove_connector run under the single global
// SUPERBULL_API_TOKEN, so they see connectors across every workspace on the
// deployment (matching the pre-multi-tenant hub API this route replaces the
// front door for). Pending the owner's auth-model decision, MCP auth should
// move to per-workspace API keys and scope these tools to one workspace.
const instructions = `superbull monitors BullMQ deployments through connectors, processes that stream queue activity into a workspace over the hosted gateway.

DISCOVER: list_connectors shows every connector in the deployment (never returns enrollment tokens); create new connectors in the web UI (Connectors, New connector). remove_connector deletes one.

INSPECT: list_queues(connector_id) gives every queue's name, job counts, and paused state. get_queue(connector_id, queue_name) drills into one queue's current page of jobs; pass status to filter (e.g. "failed") and page to paginate.

ACT: retry_job(connector_id, queue_name, job_id) retries a failed or completed job. pause_queue/resume_queue(connector_id, queue_name) stop or start processing.`;

const handler = createMcpHandler(
  (server) => {
    registerListConnectorsTool(server);
    registerRemoveConnectorTool(server);
    registerListQueuesTool(server);
    registerGetQueueTool(server);
    registerRetryJobTool(server);
    registerPauseQueueTool(server);
    registerResumeQueueTool(server);
  },
  {
    serverInfo: { name: 'superbull-hub', version: '0.1.0' },
    instructions,
  },
  {
    basePath: '/api',
    maxDuration: 60,
    disableSse: true,
  },
);

async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  const token = env.SUPERBULL_API_TOKEN;
  if (!token || !bearerToken) {
    return undefined;
  }

  const presented = Buffer.from(bearerToken);
  const expected = Buffer.from(token);
  const authorized = presented.length === expected.length && timingSafeEqual(presented, expected);
  if (!authorized) {
    return undefined;
  }

  return { token: bearerToken, clientId: 'hub', scopes: ['hub'] };
}

const authedHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
