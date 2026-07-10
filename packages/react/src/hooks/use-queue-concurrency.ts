import { useQuery } from '@tanstack/react-query';
import { getQueueConcurrency } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useQueueConcurrency(queueName: string) {
  return useQuery({
    queryKey: ['queue-concurrency', queueName],
    queryFn: () => getQueueConcurrency(queueName),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
  });
}
