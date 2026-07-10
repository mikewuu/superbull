import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getQueueMetrics } from '../lib/api-client';

export interface OverviewMetrics {
  jobsPerMinute: number;
  jobsPastHour: number;
  failedPastDay: number;
}

export function useOverviewMetrics(queueNames: string[]) {
  return useQuery({
    queryKey: ['overview-metrics', queueNames],
    enabled: queueNames.length > 0,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<OverviewMetrics> => {
      const completed = await Promise.all(
        queueNames.map((queueName) => getQueueMetrics({ queueName, type: 'completed' })),
      );
      const failed = await Promise.all(
        queueNames.map((queueName) => getQueueMetrics({ queueName, type: 'failed' })),
      );

      const perMinute = (buckets: number[][]) =>
        buckets.reduce((total, data) => total + (data[0] ?? 0), 0);
      const window = (buckets: number[][], minutes: number) =>
        buckets.reduce(
          (total, data) => total + data.slice(0, minutes).reduce((sum, value) => sum + value, 0),
          0,
        );

      const completedBuckets = completed.map((metrics) => metrics.data);
      const failedBuckets = failed.map((metrics) => metrics.data);

      return {
        jobsPerMinute: perMinute(completedBuckets) + perMinute(failedBuckets),
        jobsPastHour: window(completedBuckets, 60) + window(failedBuckets, 60),
        failedPastDay: window(failedBuckets, 1440),
      };
    },
  });
}
