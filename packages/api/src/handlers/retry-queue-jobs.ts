import type { BoardRequest, HandlerResponse } from '../types';

export async function retryQueueJobs(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '', status = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }
  if (queue.readOnlyMode) {
    return { status: 405, body: { error: 'queue is read-only' } };
  }

  if (status !== 'failed' && status !== 'completed') {
    return { status: 400, body: { error: `"${status}" is not a retriable status` } };
  }

  const jobs = await queue.getJobs([status]);
  await Promise.all(jobs.map((job) => job.retry(status)));

  return { status: 204, body: {} };
}
