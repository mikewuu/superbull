import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promoteQueueJobs } from '../lib/api-client';

export function usePromoteQueueJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => promoteQueueJobs(queueName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
