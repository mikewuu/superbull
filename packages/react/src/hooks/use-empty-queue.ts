import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emptyQueue } from '../lib/api-client';

export function useEmptyQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => emptyQueue(queueName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
