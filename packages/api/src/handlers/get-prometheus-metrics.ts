import type { BoardRequest, HandlerResponse } from '../types';

export async function getPrometheusMetrics(req: BoardRequest): Promise<HandlerResponse> {
  const perQueueMetrics = await Promise.all(
    [...req.queues.values()].map((queue) => queue.getPrometheusMetrics()),
  );

  return { body: perQueueMetrics.join('\n'), contentType: 'text/plain' };
}
