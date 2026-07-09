import { useQuery } from '@tanstack/react-query';
import { getJobLogs } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useJobLogs(args: { queueName: string; jobId: string }) {
  return useQuery({
    queryKey: ['job-logs', args.queueName, args.jobId],
    queryFn: () => getJobLogs(args),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
  });
}
