import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getJobNames } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useJobNames(queueName: string) {
  return useQuery({
    queryKey: ['job-names', queueName],
    queryFn: () => getJobNames(queueName),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
    placeholderData: keepPreviousData,
  });
}
