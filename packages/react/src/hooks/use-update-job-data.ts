import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateJobData } from '../lib/api-client';

export function useUpdateJobData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; jobId: string; data: Record<string, unknown> }) =>
      updateJobData(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}
