import { z } from 'zod';
import type { BoardRequest, HandlerResponse } from '../types';

const querySchema = z.object({
  type: z.enum(['completed', 'failed']).default('completed'),
  start: z.coerce.number().int().nonnegative().default(0),
  end: z.coerce.number().int().default(-1),
});

export async function getQueueMetrics(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid query', issues: parsed.error.issues } };
  }

  const { type, start, end } = parsed.data;
  const metrics = await queue.getMetrics(type, start, end);

  return { body: metrics };
}
