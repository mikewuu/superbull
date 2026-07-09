import { useMutation, useQueryClient } from '@tanstack/react-query';
import { retryQueueJobs } from '../lib/api-client';
import type { JobRetryStatus } from '../lib/api-types';

export function useRetryQueueJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; status: JobRetryStatus }) => retryQueueJobs(args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
