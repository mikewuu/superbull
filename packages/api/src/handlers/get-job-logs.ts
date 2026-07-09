import type { BoardRequest, HandlerResponse } from '../types';

export async function getJobLogs(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '', jobId = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const logs = await queue.getJobLogs(jobId);

  return { body: { logs } };
}
