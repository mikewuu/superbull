import { EmptyState, PageHeader, Skeleton } from '@superbull/ui';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  PauseCircle,
  Users,
} from 'lucide-react';
import { ConnectorDisconnectedNotice } from '../../components/connector-disconnected-notice';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useOverviewMetrics } from '../../hooks/use-overview-metrics';
import { useQueues } from '../../hooks/use-queues';
import { isConnectorDisconnectedError } from '../../lib/api-client';
import type { AppQueue } from '../../lib/api-types';
import { RedisStatsCard } from './_components/redis-stats-card';
import { StatTile } from './_components/stat-tile';
import { ThroughputChart } from './_components/throughput-chart';
import { WorkloadTable } from './_components/workload-table';

export function OverviewPage() {
  useDocumentTitle(null);
  const { data: queues, error, isLoading } = useQueues({});
  const { data: metrics } = useOverviewMetrics(queues?.map((queue) => queue.name) ?? []);
  const pausedCount = queues?.filter((queue) => queue.is_paused).length ?? 0;

  return (
    <>
      <PageHeader title="Overview" subtitle="Real-time activity across your queues." />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {error &&
          (isConnectorDisconnectedError(error) ? (
            <ConnectorDisconnectedNotice />
          ) : (
            <p className="rounded-lg border border-border-subtle bg-bg-error/50 px-4 py-3 text-sm text-content-error">
              Failed to load queues: {error.message}
            </p>
          ))}

        {isLoading && (
          <>
            <Skeleton className="h-[92px] rounded-lg" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        )}

        {queues && (
          <>
            <div className="candy-card grid grid-cols-2 divide-x divide-y divide-border-subtle rounded-lg sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
              <StatTile
                label="Jobs per minute"
                value={(metrics?.jobsPerMinute ?? 0).toLocaleString()}
                icon={Activity}
                tint="blue"
                subline="completed + failed"
              />
              <StatTile
                label="Jobs past hour"
                value={(metrics?.jobsPastHour ?? 0).toLocaleString()}
                icon={Clock}
                tint="violet"
                deltaPercent={metrics?.prevHourDelta.jobsPastHour}
              />
              <StatTile
                subline="across all queues"
                label="Failed past 24h"
                value={(metrics?.failedPastDay ?? 0).toLocaleString()}
                icon={AlertCircle}
                tint="red"
                accent={(metrics?.failedPastDay ?? 0) > 0 ? 'error' : undefined}
              />
              <StatTile
                subline="connected now"
                label="Workers"
                value={sumWorkers(queues)}
                icon={Users}
                tint="green"
              />
              <StatTile
                label="Status"
                subline="all queues"
                value={
                  <span className="font-sans text-[19px]">
                    {pausedCount > 0 ? `${pausedCount} paused` : 'Active'}
                  </span>
                }
                icon={pausedCount > 0 ? PauseCircle : CheckCircle2}
                tint={pausedCount > 0 ? 'amber' : 'green'}
                accent={pausedCount > 0 ? 'warning' : 'success'}
              />
            </div>

            <ThroughputChart
              completedBuckets={metrics?.completedBuckets ?? []}
              failedBuckets={metrics?.failedBuckets ?? []}
              deltaPercent={metrics?.prevHourDelta.jobsPastHour ?? null}
            />

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
