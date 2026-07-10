import { Skeleton } from '@superbull/ui';
import { useQueuePriorities } from '../../../hooks/use-queue-priorities';

interface InsightsPrioritiesProps {
  queueName: string;
}

export function InsightsPriorities(props: InsightsPrioritiesProps) {
  const { queueName } = props;
  const { data: priorities, isPending } = useQueuePriorities(queueName);

  if (isPending) {
    return (
      <div className="px-4 py-3" data-testid="insights-priorities">
        <h3 className="mb-2 text-xs font-medium text-content-subtle">Priorities</h3>
        <Skeleton className="h-6" />
      </div>
    );
  }

  if (!priorities || priorities.length === 0) {
    return (
      <div className="px-4 py-3" data-testid="insights-priorities">
        <h3 className="mb-2 text-xs font-medium text-content-subtle">Priorities</h3>
        <p className="text-xs text-content-muted">No priority data yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3" data-testid="insights-priorities">
      <h3 className="mb-2 text-xs font-medium text-content-subtle">Priorities</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {priorities.map((entry) => (
          <span
            key={entry.priority}
            className="rounded-md bg-bg-subtle px-2 py-0.5 font-mono text-xs text-content-default"
          >
            p{entry.priority}×{entry.count}
          </span>
        ))}
      </div>
    </div>
  );
}
