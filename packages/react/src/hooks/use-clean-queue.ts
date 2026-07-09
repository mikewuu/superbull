import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cleanQueue } from '../lib/api-client';
import type { JobCleanStatus } from '../lib/api-types';

export function useCleanQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; status: JobCleanStatus }) => cleanQueue(args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
