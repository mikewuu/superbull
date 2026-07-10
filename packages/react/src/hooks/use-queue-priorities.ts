import { useQuery } from '@tanstack/react-query';
import { getQueuePriorities } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useQueuePriorities(queueName: string) {
  return useQuery({
    queryKey: ['queue-priorities', queueName],
    queryFn: () => getQueuePriorities(queueName),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
  });
}
