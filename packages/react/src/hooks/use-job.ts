import { useQuery } from '@tanstack/react-query';
import { getJob } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useJob(args: { queueName: string; jobId: string }) {
  return useQuery({
    queryKey: ['job', args.queueName, args.jobId],
    queryFn: () => getJob(args),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
  });
}
