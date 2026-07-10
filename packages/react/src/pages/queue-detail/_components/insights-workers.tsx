import { EmptyState, Skeleton } from '@superbull/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserX } from 'lucide-react';
import { useQueueWorkers } from '../../../hooks/use-queue-workers';

interface InsightsWorkersProps {
  queueName: string;
}

export function InsightsWorkers(props: InsightsWorkersProps) {
  const { queueName } = props;
  const { data: workers, isPending } = useQueueWorkers(queueName);

  return (
    <div className="px-4 py-3" data-testid="insights-workers">
      <h3 className="mb-2 text-xs font-medium text-content-subtle">Workers</h3>
      {isPending ? (
        <Skeleton className="h-10" />
      ) : !workers || workers.length === 0 ? (
        <div className="rounded-lg bg-bg-warning/40">
          <EmptyState
            icon={UserX}
            title="No workers connected"
            description="Jobs won't be processed until a worker connects to this queue."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {workers.map((worker, index) => (
            <div
              key={worker.id ?? `${worker.name}-${index}`}
              data-testid="insights-worker-row"
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="truncate font-medium text-content-emphasis">
                {worker.name ?? 'worker'}
              </span>
              <span className="truncate font-mono text-content-muted">{worker.addr ?? '—'}</span>
              <span className="shrink-0 text-content-muted">
                {worker.started_ms
                  ? formatDistanceToNowStrict(worker.started_ms, { addSuffix: true })
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
