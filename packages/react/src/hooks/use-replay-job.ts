import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addJob } from '../lib/api-client';

export function useReplayJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; jobName: string; data: unknown }) =>
      addJob({
        queueName: args.queueName,
        name: args.jobName,
        data: args.data,
        options: null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
