import type { BoardRequest, HandlerResponse } from '../types';

const priorityScanSize = 500;

export async function getQueuePriorities(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const prioritizedJobs = await queue.getJobs(['prioritized'], 0, priorityScanSize - 1, false);
  const distinctPriorities = [...new Set(prioritizedJobs.map((job) => job.toJSON().priority))];
  if (distinctPriorities.length === 0) {
    return { body: { priorities: [] } };
  }

  const counts = await queue.getCountsPerPriority(distinctPriorities);
  const priorities = distinctPriorities
    .map((priority) => ({ priority, count: counts[`${priority}`] ?? 0 }))
    .sort((a, b) => a.priority - b.priority);

  return { body: { priorities } };
}
