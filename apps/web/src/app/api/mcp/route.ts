import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { isWithinRateLimit } from '../../../lib/api/is-within-rate-limit';
import { secondsUntilRateLimitReset } from '../../../lib/api/seconds-until-rate-limit-reset';
import { findCaller } from '../../../lib/auth/find-caller';
import { env } from '../../../lib/config/env';
import { registerAddJobTool } from '../../../lib/mcp/register-add-job-tool';
import { registerCleanQueueTool } from '../../../lib/mcp/register-clean-queue-tool';
import { registerGetJobLogsTool } from '../../../lib/mcp/register-get-job-logs-tool';
import { registerGetJobTool } from '../../../lib/mcp/register-get-job-tool';
import { registerGetQueueStatsTool } from '../../../lib/mcp/register-get-queue-stats-tool';
import { registerGetQueueTool } from '../../../lib/mcp/register-get-queue-tool';
import { registerListConnectorsTool } from '../../../lib/mcp/register-list-connectors-tool';
import { registerListQueuesTool } from '../../../lib/mcp/register-list-queues-tool';
import { registerPauseQueueTool } from '../../../lib/mcp/register-pause-queue-tool';
import { registerPromoteJobTool } from '../../../lib/mcp/register-promote-job-tool';
import { registerRemoveConnectorTool } from '../../../lib/mcp/register-remove-connector-tool';
import { registerRemoveJobTool } from '../../../lib/mcp/register-remove-job-tool';
import { registerResumeQueueTool } from '../../../lib/mcp/register-resume-queue-tool';
import { registerRetryJobTool } from '../../../lib/mcp/register-retry-job-tool';

const instructions = `superbull monitors BullMQ deployments through connectors, processes that stream queue activity into a project over the hosted gateway.

DISCOVER: list_connectors shows every connector in your projects (never returns enrollment tokens); create new connectors in the web UI (Connectors, New connector). remove_connector deletes one.

INSPECT: list_queues(connector_id) gives every queue's name, job counts, and paused state. get_queue(connector_id, queue_name) drills into one queue's current page of jobs; pass status to filter (e.g. "failed") and page to paginate. get_queue_stats(connector_id, queue_name) reports wait/run percentiles, retry rate, stalled count, top errors, and estimated drain time; start there when diagnosing a slow or failing queue. get_job(connector_id, queue_name, job_id) returns one job in full (data, attempts, failed_reason, stacktrace, return_value); get_job_logs returns the lines it logged.

ACT: add_job(connector_id, queue_name, name, data?, options?) enqueues a job (data defaults to null). retry_job re-runs a failed or completed job (fails if the queue disables retries). promote_job makes a delayed job runnable now. remove_job deletes one job. pause_queue/resume_queue stop or start processing. clean_queue(connector_id, queue_name, status) bulk-deletes the jobs in one status older than a 5-second grace window. Mutations against read-only queues fail with "queue is read-only".`;

const handler = createMcpHandler(
  (server) => {
    registerListConnectorsTool(server);
    registerRemoveConnectorTool(server);
    registerListQueuesTool(server);
    registerGetQueueTool(server);
    registerGetQueueStatsTool(server);
    registerGetJobTool(server);
    registerGetJobLogsTool(server);
    registerAddJobTool(server);
    registerRetryJobTool(server);
    registerPromoteJobTool(server);
    registerRemoveJobTool(server);
    registerPauseQueueTool(server);
    registerResumeQueueTool(server);
    registerCleanQueueTool(server);
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

const callerByRequest = new WeakMap<Request, NonNullable<Awaited<ReturnType<typeof findCaller>>>>();

async function getCaller(req: Request, bearerToken?: string) {
  const cached = callerByRequest.get(req);
  if (cached) {
    return cached;
  }
  if (!bearerToken) {
    return null;
  }

  const caller = await findCaller(bearerToken);
  if (caller) {
    callerByRequest.set(req, caller);
  }
  return caller;
}

async function verifyToken(req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  const caller = await getCaller(req, bearerToken);
  if (!caller || !bearerToken) {
    return undefined;
  }

  return {
    token: bearerToken,
    clientId: String(caller.userId),
    scopes: caller.scopes,
    extra: {
      userId: String(caller.userId),
      projectId: caller.projectId ? String(caller.projectId) : null,
    },
  };
}

const authedHandler = withMcpAuth(handler, verifyToken, { required: true });

async function rateLimitedHandler(req: Request): Promise<Response> {
  const header = req.headers.get('authorization') ?? '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const caller = await getCaller(req, bearerToken);

  if (caller && !(await isWithinRateLimit(caller.userId))) {
    return Response.json(
      {
        type: 'rate_limited',
        message: `Rate limit exceeded (${env.RATE_LIMIT_PER_MINUTE} requests/minute). Retry shortly.`,
      },
      {
        status: 429,
        headers: { 'retry-after': String(secondsUntilRateLimitReset()) },
      },
    );
  }

  return authedHandler(req);
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST, rateLimitedHandler as DELETE };
