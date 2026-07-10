import { useQuery } from '@tanstack/react-query';
import { getQueueStats } from '../lib/api-client';

export function useQueueStats(queueName: string) {
  return useQuery({
    queryKey: ['queue-stats', queueName],
    queryFn: () => getQueueStats(queueName),
    refetchInterval: 60_000,
  });
}
