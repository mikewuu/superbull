import { useQuery } from '@tanstack/react-query';
import { getQueueWorkers } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useQueueWorkers(queueName: string) {
  return useQuery({
    queryKey: ['queue-workers', queueName],
    queryFn: () => getQueueWorkers(queueName),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
  });
}
