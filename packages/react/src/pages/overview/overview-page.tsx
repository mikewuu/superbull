import { Inbox } from 'lucide-react';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { Skeleton } from '../../components/skeleton';
import { useQueues } from '../../hooks/use-queues';
import type { AppQueue } from '../../lib/api-types';
import { QueueCard } from './_components/queue-card';
import { RedisStatsCard } from './_components/redis-stats-card';
import { StatTile } from './_components/stat-tile';

export function OverviewPage() {
  const { data: queues, error, isLoading } = useQueues({});

  return (
    <>
      <PageHeader title="Queues" />
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-3 py-6 lg:px-6">
        {error && (
          <p className="rounded-xl border border-red-200 bg-bg-error/40 px-4 py-3 text-sm text-content-error">
            Failed to load queues: {error.message}
          </p>
        )}

        {isLoading && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          </>
        )}

        {queues && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Queues" value={queues.length} />
              <StatTile label="Active" value={sumCount(queues, 'active')} accent="info" />
              <StatTile label="Waiting" value={sumCount(queues, 'waiting')} />
              <StatTile label="Failed" value={sumCount(queues, 'failed')} accent="error" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {queues.map((queue) => (
                <QueueCard key={queue.name} queue={queue} />
              ))}
            </div>

            {queues.length === 0 && (
              <div className="rounded-xl border border-border-subtle bg-bg-default">
                <EmptyState
                  icon={Inbox}
                  title="No queues registered"
                  description="Register your BullMQ queues with createBoard to see them here."
                />
              </div>
            )}

            <RedisStatsCard />
          </>
        )}
      </div>
    </>
  );
}

function sumCount(queues: AppQueue[], status: 'active' | 'waiting' | 'failed'): number {
  return queues.reduce((total, queue) => total + (queue.counts[status] ?? 0), 0);
}
