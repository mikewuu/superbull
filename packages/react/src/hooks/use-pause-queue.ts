import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pauseQueue } from '../lib/api-client';

export function usePauseQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => pauseQueue(queueName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
