import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addJob } from '../lib/api-client';

export function useAddJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      queueName: string;
      name: string;
      data: unknown;
      options: { delay?: number; attempts?: number; priority?: number } | null;
    }) => addJob(args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
