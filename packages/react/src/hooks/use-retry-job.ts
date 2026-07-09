import { useMutation, useQueryClient } from '@tanstack/react-query';
import { retryJob } from '../lib/api-client';

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; jobId: string }) => retryJob(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}
