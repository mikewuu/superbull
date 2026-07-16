import { Button, EmptyState, Skeleton, cn } from '@superbull/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { ListTodo, Play } from 'lucide-react';
import { useJobNames } from '../../../hooks/use-job-names';

interface JobNamesTableProps {
  queueName: string;
  onRun: (jobName: string) => void;
}

export function JobNamesTable(props: JobNamesTableProps) {
  const { queueName, onRun } = props;
  const { data: jobNames, isPending } = useJobNames(queueName);

  if (isPending) {
    return (
      <div data-testid="job-names-table" className="candy-card flex flex-col gap-2 rounded-lg p-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (!jobNames || jobNames.length === 0) {
    return (
      <div data-testid="job-names-table" className="candy-card rounded-lg">
        <EmptyState
          icon={<ListTodo className="size-5 text-content-muted" />}
          title="No jobs yet"
          description="Add a job to see its name aggregated here."
        />
      </div>
    );
  }

  return (
    <div data-testid="job-names-table" className="candy-card overflow-x-auto rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-3 py-2.5 font-medium">Name</th>
            <th className="px-3 py-2.5 font-medium">Activity (24h)</th>
            <th className="px-3 py-2.5 text-right font-medium">Completed</th>
            <th className="px-3 py-2.5 text-right font-medium">Failed</th>
            <th className="px-3 py-2.5 text-right font-medium">Failure rate</th>
            <th className="px-3 py-2.5 text-right font-medium">Avg duration</th>
            <th className="px-3 py-2.5 text-right font-medium">Pending</th>
            <th className="w-16 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {jobNames.map((entry) => (
            <tr
              key={entry.name}
              data-testid="job-name-row"
              className="group border-b border-border-subtle last:border-b-0 hover:bg-bg-muted"
            >
              <td className="max-w-64 px-3 py-2">
                <div className="flex flex-col">
                  <span
                    title={entry.name}
                    className="truncate text-2sm font-medium text-content-emphasis"
                  >
                    {entry.name}
                  </span>
                  <span className="text-[11px] text-content-muted">
                    last seen {formatDistanceToNowStrict(entry.last_seen_ms, { addSuffix: true })}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2">
                <ActivitySparkline activity={entry.activity} />
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-content-subtle">
                {entry.completed_count.toLocaleString()}
              </td>
              <td
                className={cn(
                  'px-3 py-2 text-right font-mono text-xs tabular-nums text-content-subtle',
                  { 'text-content-error': entry.failed_count > 0 },
                )}
              >
                {entry.failed_count.toLocaleString()}
              </td>
              <td
                className={cn(
                  'px-3 py-2 text-right font-mono text-xs tabular-nums text-content-subtle',
                  {
                    'text-content-error': entry.failure_rate > 0.05,
                    'text-content-muted': entry.failure_rate === 0,
                  },
                )}
              >
                {(entry.failure_rate * 100).toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-content-subtle">
                {formatAvgDuration(entry.avg_duration_ms)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-content-muted">
                {entry.pending_count.toLocaleString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    icon={<Play className="size-3" />}
                    text="Run"
                    onClick={() => onRun(entry.name)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatAvgDuration(avgDurationMs: number | null): string {
  if (avgDurationMs === null) {
    return '—';
  }
  if (avgDurationMs < 1000) {
    return `${avgDurationMs}ms`;
  }
  if (avgDurationMs < 60_000) {
    return `${(avgDurationMs / 1000).toFixed(1)}s`;
  }
  return `${Math.round(avgDurationMs / 60_000)}m`;
}

interface ActivitySparklineProps {
  activity: number[];
}

function ActivitySparkline(props: ActivitySparklineProps) {
  const { activity } = props;
  const bars = [...activity].reverse();
  const max = Math.max(...bars, 1);
  const barHeight = 24;
  const barWidth = 3;
  const gap = 1;

  return (
    <svg
      data-testid="activity-sparkline"
      className="h-6 w-24"
      viewBox={`0 0 ${bars.length * (barWidth + gap) - gap} ${barHeight}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Activity over the last 24 hours"
    >
      {bars.map((count, index) => {
        const height = count === 0 ? 2 : Math.max(Math.round((count / max) * barHeight), 2);
        return (
          <rect
            key={`${index}-${count}`}
            x={index * (barWidth + gap)}
            y={barHeight - height}
            width={barWidth}
            height={height}
            rx={1}
            className={cn('fill-blue-500/70', { 'fill-border-subtle': count === 0 })}
          />
        );
      })}
    </svg>
  );
}
