import { useMutation, useQueryClient } from '@tanstack/react-query';
import { obliterateQueue } from '../lib/api-client';

export function useObliterateQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => obliterateQueue(queueName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
