import type { BoardRequest, HandlerResponse } from '../types';

export async function getQueueWorkers(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const workers = await queue.getWorkers();

  return { body: { workers } };
}
