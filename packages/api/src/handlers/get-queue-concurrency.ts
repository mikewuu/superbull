import type { BoardRequest, HandlerResponse } from '../types';

export async function getQueueConcurrency(req: BoardRequest): Promise<HandlerResponse> {
  const { queueName = '' } = req.params;
  const queue = req.queues.get(queueName);
  if (!queue) {
    return { status: 404, body: { error: 'queue not found' } };
  }

  const [globalConcurrency, rateLimitTtlMs] = await Promise.all([
    queue.getGlobalConcurrency(),
    queue.getRateLimitTtl(),
  ]);

  return { body: { global_concurrency: globalConcurrency, rate_limit_ttl_ms: rateLimitTtlMs } };
}
