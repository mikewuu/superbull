import { z } from 'zod';
import type { BoardRequest, HandlerResponse } from '../types';

const statusSchema = z
  .enum(['completed', 'wait', 'waiting', 'active', 'delayed', 'failed'])
  .transform((status) => (status === 'waiting' ? 'wait' : status));

// Retains jobs newer than the grace window so an accidental clean can't drop in-flight work.
const cleanGraceTimeMs = 5000;

export async function cleanQueue(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }
  if (queue.readOnlyMode) {
    return { status: 405, body: { error: 'queue is read-only' } };
  }

  const parsedStatus = statusSchema.safeParse(req.params.status);
  if (!parsedStatus.success) {
    return { status: 400, body: { error: `"${req.params.status}" is not a cleanable status` } };
  }

  await queue.clean(parsedStatus.data, cleanGraceTimeMs);

  return { status: 204, body: {} };
}
