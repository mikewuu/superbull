import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyBulkJobAction } from '../lib/api-client';
import type { BulkJobAction } from '../lib/api-types';

export function useBulkJobAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { queueName: string; action: BulkJobAction; jobIds: string[] }) =>
      applyBulkJobAction(args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });
}
