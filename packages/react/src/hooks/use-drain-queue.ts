import { useMutation, useQueryClient } from '@tanstack/react-query';
import { drainQueue } from '../lib/api-client';

export function useDrainQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => drainQueue(queueName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
