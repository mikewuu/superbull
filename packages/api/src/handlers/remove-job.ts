import type { BoardRequest, HandlerResponse } from '../types';

export async function removeJob(req: BoardRequest): Promise<HandlerResponse> {
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

  await job.remove();

  return { status: 204, body: {} };
}
