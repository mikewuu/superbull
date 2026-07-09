import { useQuery } from '@tanstack/react-query';
import { getRedisStats } from '../lib/api-client';
import { readUIConfig } from '../lib/read-ui-config';

export function useRedisStats() {
  return useQuery({
    queryKey: ['redis-stats'],
    queryFn: () => getRedisStats(),
    refetchInterval: readUIConfig().polling_interval_ms ?? 5000,
  });
}
