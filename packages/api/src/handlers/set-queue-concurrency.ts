import { z } from 'zod';
import type { BoardRequest, HandlerResponse } from '../types';

const bodySchema = z.object({
  global_concurrency: z.number().int().positive(),
});

export async function setQueueConcurrency(req: BoardRequest): Promise<HandlerResponse> {
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

  await queue.setGlobalConcurrency(parsed.data.global_concurrency);

  return { status: 204, body: {} };
}
