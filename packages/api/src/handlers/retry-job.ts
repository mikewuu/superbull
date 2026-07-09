import type { BoardRequest, HandlerResponse } from '../types';

export async function retryJob(req: BoardRequest): Promise<HandlerResponse> {
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

  const state = await job.getState();
  if (state !== 'failed' && state !== 'completed') {
    return { status: 400, body: { error: `job is in "${state}" state and cannot be retried` } };
  }

  await job.retry(state);

  return { status: 204, body: {} };
}
