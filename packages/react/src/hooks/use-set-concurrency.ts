import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setQueueConcurrency } from '../lib/api-client';

export function useSetConcurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; globalConcurrency: number }) =>
      setQueueConcurrency(args),
    onSuccess: (_, args) =>
      queryClient.invalidateQueries({ queryKey: ['queue-concurrency', args.queueName] }),
  });
}
