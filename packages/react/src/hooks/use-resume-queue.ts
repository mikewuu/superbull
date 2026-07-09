import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resumeQueue } from '../lib/api-client';

export function useResumeQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => resumeQueue(queueName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
