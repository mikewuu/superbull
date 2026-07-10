import { z } from 'zod';
import { formatJob } from '../format-job';
import type { BoardRequest, HandlerResponse } from '../types';

const bodySchema = z.object({
  name: z.string().min(1),
  data: z.unknown(),
  options: z
    .object({
      delay: z.number().int().nonnegative().optional(),
      attempts: z.number().int().positive().optional(),
      priority: z.number().int().optional(),
    })
    .nullable(),
});

export async function addJob(req: BoardRequest): Promise<HandlerResponse> {
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

  const { name, data, options } = parsed.data;
  const job = await queue.addJob(name, data, options ?? {});
  const status = await job.getState();

  return { status: 201, body: { job: formatJob(job, queue.format), status } };
}
