import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type GetQueuesParams, getQueues } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useQueues(params: GetQueuesParams) {
  return useQuery({
    queryKey: ['queues', params],
    queryFn: () => getQueues(params),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
    placeholderData: keepPreviousData,
  });
}
