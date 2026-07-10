import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getQueueMetrics } from '../lib/api-client';

export interface OverviewMetrics {
  jobsPerMinute: number;
  jobsPastHour: number;
  failedPastDay: number;
  completedBuckets: number[];
  failedBuckets: number[];
  prevHourDelta: { jobsPastHour: number | null };
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

      const completedBuckets = sumBucketsAcrossQueues(completed.map((metrics) => metrics.data));
      const failedBuckets = sumBucketsAcrossQueues(failed.map((metrics) => metrics.data));

      const jobsPerMinute = (completedBuckets[0] ?? 0) + (failedBuckets[0] ?? 0);
      const jobsPastHour = sumWindow(completedBuckets, 0, 60) + sumWindow(failedBuckets, 0, 60);
      const failedPastDay = sumWindow(failedBuckets, 0, 1440);

      const hasPrevHour = Math.max(completedBuckets.length, failedBuckets.length) >= 120;
      const prevHourJobs = sumWindow(completedBuckets, 60, 120) + sumWindow(failedBuckets, 60, 120);

      return {
        jobsPerMinute,
        jobsPastHour,
        failedPastDay,
        completedBuckets,
        failedBuckets,
        prevHourDelta: {
          jobsPastHour: hasPrevHour ? computeDeltaPercent(jobsPastHour, prevHourJobs) : null,
        },
      };
    },
  });
}

function sumBucketsAcrossQueues(bucketsList: number[][]): number[] {
  const maxLength = Math.max(0, ...bucketsList.map((buckets) => buckets.length));
  return Array.from({ length: maxLength }, (_, index) =>
    bucketsList.reduce((total, buckets) => total + (buckets[index] ?? 0), 0),
  );
}

function sumWindow(buckets: number[], start: number, end: number): number {
  return buckets.slice(start, end).reduce((total, value) => total + value, 0);
}

function computeDeltaPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}
