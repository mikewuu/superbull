import { z } from 'zod';
import type { BoardRequest, HandlerResponse, QueueJob } from '../types';

const bodySchema = z.object({
  action: z.enum(['retry', 'promote', 'remove']),
  job_ids: z.array(z.union([z.string(), z.number()]).transform(String)).min(1),
});

type BulkAction = z.infer<typeof bodySchema>['action'];
type FoundJob = { jobId: string; job: QueueJob };

export async function applyBulkJobAction(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }
  if (queue.readOnlyMode) {
    return { status: 405, body: { error: 'queue is read-only' } };
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid request body', issues: parsed.error.issues } };
  }

  const { action, job_ids: jobIds } = parsed.data;
  if (action === 'retry' && !queue.allowRetries) {
    return { status: 405, body: { error: 'retries are disabled for this queue' } };
  }
  const found = await Promise.all(
    jobIds.map(async (jobId) => ({ jobId, job: await queue.findJob(jobId) })),
  );

  const missingIds = found.filter((entry) => !entry.job).map((entry) => entry.jobId);
  if (missingIds.length > 0) {
    return { status: 400, body: { error: 'jobs not found', job_ids: missingIds } };
  }

  const jobs = found.flatMap((entry) =>
    entry.job ? [{ jobId: entry.jobId, job: entry.job }] : [],
  );
  const invalidIds = await findInvalidJobIds({
    action,
    jobs,
    allowCompletedRetries: queue.allowCompletedRetries,
  });
  if (invalidIds.length > 0) {
    return {
      status: 400,
      body: { error: `jobs are not in a state that allows "${action}"`, job_ids: invalidIds },
    };
  }

  await Promise.all(jobs.map((entry) => applyAction(action, entry.job)));

  return { status: 204, body: {} };
}

async function findInvalidJobIds(args: {
  action: BulkAction;
  jobs: FoundJob[];
  allowCompletedRetries: boolean;
}): Promise<string[]> {
  const { action, jobs, allowCompletedRetries } = args;
  if (action === 'remove') {
    return [];
  }

  const states = await Promise.all(
    jobs.map(async ({ jobId, job }) => ({ jobId, state: await job.getState() })),
  );

  if (action === 'retry') {
    return states
      .filter(({ state }) => {
        if (state === 'failed') {
          return false;
        }
        if (state === 'completed') {
          return !allowCompletedRetries;
        }
        return true;
      })
      .map(({ jobId }) => jobId);
  }

  return states.filter(({ state }) => state !== 'delayed').map(({ jobId }) => jobId);
}

async function applyAction(action: BulkAction, job: QueueJob): Promise<void> {
  if (action === 'retry') {
    const state = await job.getState();
    await job.retry(state === 'completed' ? 'completed' : 'failed');
    return;
  }

  if (action === 'promote') {
    await job.promote();
    return;
  }

  await job.remove();
}
