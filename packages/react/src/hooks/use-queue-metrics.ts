import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getQueueMetrics } from '../lib/api-client';
import type { MetricsType } from '../lib/api-types';

export function useQueueMetrics(args: { queueName: string; type: MetricsType }) {
  return useQuery({
    queryKey: ['queue-metrics', args.queueName, args.type],
    queryFn: () => getQueueMetrics(args),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
}
