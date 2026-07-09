import { z } from 'zod';
import type { BoardRequest, HandlerResponse } from '../types';

const bodySchema = z.object({
  data: z.record(z.unknown()),
});

export async function updateJobData(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '', jobId = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }
  if (queue.readOnlyMode) {
    return { status: 405, body: { error: 'queue is read-only' } };
  }

  const job = await queue.findJob(jobId);
  if (!job) {
    return { status: 404, body: { error: 'job not found' } };
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid request body', issues: parsed.error.issues } };
  }

  await job.updateData(parsed.data.data);

  return { status: 204, body: {} };
}
