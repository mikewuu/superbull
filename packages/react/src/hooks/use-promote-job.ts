import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promoteJob } from '../lib/api-client';

export function usePromoteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; jobId: string }) => promoteJob(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}
