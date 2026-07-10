import { CheckCircle2, Inbox, PauseCircle } from 'lucide-react';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { Skeleton } from '../../components/skeleton';
import { useOverviewMetrics } from '../../hooks/use-overview-metrics';
import { useQueues } from '../../hooks/use-queues';
import type { AppQueue } from '../../lib/api-types';
import { RedisStatsCard } from './_components/redis-stats-card';
import { StatTile } from './_components/stat-tile';
import { WorkloadTable } from './_components/workload-table';

export function OverviewPage() {
  const { data: queues, error, isLoading } = useQueues({});
  const { data: metrics } = useOverviewMetrics(queues?.map((queue) => queue.name) ?? []);

  return (
    <>
      <PageHeader title="Overview" />
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4 px-3 py-5 lg:px-6">
        {error && (
          <p className="rounded-lg border border-red-200 bg-bg-error/50 px-4 py-3 text-sm text-content-error">
            Failed to load queues: {error.message}
          </p>
        )}

        {isLoading && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-[74px]" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </>
        )}

        {queues && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile label="Jobs per minute" value={metrics?.jobsPerMinute ?? 0} />
              <StatTile label="Jobs past hour" value={metrics?.jobsPastHour ?? 0} />
              <StatTile
                label="Failed past 24h"
                value={metrics?.failedPastDay ?? 0}
                accent={(metrics?.failedPastDay ?? 0) > 0 ? 'error' : undefined}
              />
              <StatTile label="Workers" value={sumWorkers(queues)} />
              <StatTile label="Status" value={<OverallStatus queues={queues} />} />
            </div>

            {queues.length > 0 ? (
              <WorkloadTable queues={queues} />
            ) : (
              <div className="candy-card rounded-lg">
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

function sumWorkers(queues: AppQueue[]): number {
  return queues.reduce((total, queue) => total + queue.worker_count, 0);
}

function OverallStatus(props: { queues: AppQueue[] }) {
  const { queues } = props;
  const pausedCount = queues.filter((queue) => queue.is_paused).length;

  if (pausedCount > 0) {
    return (
      <span className="flex items-center gap-1.5 text-content-warning">
        <PauseCircle className="size-5" />
        {pausedCount} paused
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-content-success">
      <CheckCircle2 className="size-5" />
      Active
    </span>
  );
}
