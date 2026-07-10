import type { BoardRequest, HandlerResponse } from '../types';

export async function obliterateQueue(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }
  if (queue.readOnlyMode) {
    return { status: 405, body: { error: 'queue is read-only' } };
  }

  await queue.obliterate();

  return { status: 204, body: {} };
}
