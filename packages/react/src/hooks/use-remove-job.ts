import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeJob } from '../lib/api-client';

export function useRemoveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; jobId: string }) => removeJob(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}
