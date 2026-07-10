import { formatJob } from '../format-job';
import type { BoardRequest, HandlerResponse } from '../types';

export async function getJob(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '', jobId = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const job = await queue.findJob(jobId);
  if (!job) {
    return { status: 404, body: { error: 'job not found' } };
  }

  const status = await job.getState();

  return { body: { job: formatJob(job, queue.format), status } };
}
