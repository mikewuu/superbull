import { useQueuePriorities } from '../../../hooks/use-queue-priorities';

interface InsightsPrioritiesProps {
  queueName: string;
}

export function InsightsPriorities(props: InsightsPrioritiesProps) {
  const { queueName } = props;
  const { data: priorities } = useQueuePriorities(queueName);

  if (!priorities || priorities.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-4 py-3"
      data-testid="insights-priorities"
    >
      <span className="text-xs font-medium text-content-subtle">Priorities</span>
      {priorities.map((entry) => (
        <span
          key={entry.priority}
          className="rounded-md bg-bg-subtle px-2 py-0.5 font-mono text-xs text-content-default"
        >
          p{entry.priority}×{entry.count}
        </span>
      ))}
    </div>
  );
}
