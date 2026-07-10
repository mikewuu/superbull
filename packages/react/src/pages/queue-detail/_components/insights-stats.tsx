import { Skeleton, cn } from '@superbull/ui';
import { useQueueStats } from '../../../hooks/use-queue-stats';

interface InsightsStatsProps {
  queueName: string;
}

export function InsightsStats(props: InsightsStatsProps) {
  const { queueName } = props;
  const { data: stats, isPending } = useQueueStats(queueName);

  if (isPending) {
    return (
      <div className="px-4 py-3" data-testid="insights-stats">
        <h3 className="mb-2 text-xs font-medium text-content-subtle">Stats</h3>
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="px-4 py-3" data-testid="insights-stats">
        <h3 className="mb-2 text-xs font-medium text-content-subtle">Stats</h3>
        <p className="text-xs text-content-muted">No stats data yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 divide-x divide-y divide-border-subtle sm:grid-cols-5 sm:divide-y-0">
        <StatCell
          label="Wait p50 / p95"
          value={`${formatMsCompact(stats.wait_ms.p50)} / ${formatMsCompact(stats.wait_ms.p95)}`}
        />
        <StatCell
          label="Run p50 / p95"
          value={`${formatMsCompact(stats.run_ms.p50)} / ${formatMsCompact(stats.run_ms.p95)}`}
        />
        <StatCell
          label="Retry rate"
          value={`${Math.round(stats.retry_rate * 100)}%`}
          accentError={stats.retry_rate > 0}
        />
        <StatCell
          label="Stalled"
          value={String(stats.stalled_count)}
          accentError={stats.stalled_count > 0}
        />
        <StatCell label="Est. drain" value={formatMsCompact(stats.est_drain_ms)} />
      </div>

      <div className="px-4 py-3" data-testid="insights-top-errors">
        <h3 className="mb-2 text-xs font-medium text-content-subtle">Top errors</h3>
        {stats.top_errors.length === 0 ? (
          <p className="text-xs text-content-muted">No errors in this window.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {stats.top_errors.map((error) => (
              <div key={error.message} className="flex items-center justify-between gap-3">
                <span
                  title={error.message}
                  className="truncate font-mono text-xs text-content-error"
                >
                  {error.message}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-content-muted">
                  ×{error.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatCell(props: { label: string; value: string; accentError?: boolean }) {
  const { label, value, accentError } = props;

  return (
    <div
      data-testid={`insights-stat-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
      className="flex flex-col gap-1 px-4 py-3"
    >
      <span className="text-xs text-content-subtle">{label}</span>
      <span
        className={cn('font-mono text-sm font-semibold tabular-nums text-content-emphasis', {
          'text-content-error': accentError,
        })}
      >
        {value}
      </span>
    </div>
  );
}

function formatMsCompact(ms: number | null): string {
  if (ms === null) {
    return '—';
  }
  if (ms === 0) {
    return 'now';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3_600_000) {
    return `${Math.round(ms / 60_000)}m`;
  }
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
