import { timingSafeEqual } from 'node:crypto';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { env } from '../../../lib/config/env';
import { registerAddSourceTool } from '../../../lib/mcp/register-add-source-tool';
import { registerGetQueueTool } from '../../../lib/mcp/register-get-queue-tool';
import { registerListQueuesTool } from '../../../lib/mcp/register-list-queues-tool';
import { registerListSourcesTool } from '../../../lib/mcp/register-list-sources-tool';
import { registerPauseQueueTool } from '../../../lib/mcp/register-pause-queue-tool';
import { registerRemoveSourceTool } from '../../../lib/mcp/register-remove-source-tool';
import { registerResumeQueueTool } from '../../../lib/mcp/register-resume-queue-tool';
import { registerRetryJobTool } from '../../../lib/mcp/register-retry-job-tool';

const instructions = `superbull hub federates one or more remote superbull proxies, each fronting a BullMQ deployment.

DISCOVER: list_sources shows every proxy source registered with the hub (never returns bearer tokens). add_source registers a new one — it stores the token as a credential and never returns it again; remove_source deletes one.

INSPECT: list_queues(source_id) gives every queue's name, job counts, and paused state. get_queue(source_id, queue_name) drills into one queue's current page of jobs; pass status to filter (e.g. "failed") and page to paginate.

ACT: retry_job(source_id, queue_name, job_id) retries a failed or completed job. pause_queue/resume_queue(source_id, queue_name) stop or start processing.`;

const handler = createMcpHandler(
  (server) => {
    registerListSourcesTool(server);
    registerAddSourceTool(server);
    registerRemoveSourceTool(server);
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
