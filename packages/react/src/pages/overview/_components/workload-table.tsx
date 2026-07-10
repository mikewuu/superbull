import { CirclePause } from 'lucide-react';
import { useNavigate } from 'react-router';
import { StatusBadge } from '../../../components/status-badge';
import type { AppQueue } from '../../../lib/api-types';
import { cn } from '../../../lib/cn';

interface WorkloadTableProps {
  queues: AppQueue[];
}

export function WorkloadTable(props: WorkloadTableProps) {
  const { queues } = props;
  const navigate = useNavigate();

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <div className="border-b border-border-subtle px-5 py-3.5 text-sm font-semibold tracking-tight text-content-emphasis">
        Current workload
      </div>
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Queue</th>
            <th className="w-28 px-4 py-2.5 text-right font-medium">Waiting</th>
            <th className="w-28 px-4 py-2.5 text-right font-medium">Failed</th>
            <th className="w-28 px-4 py-2.5 text-right font-medium">Workers</th>
            <th className="w-40 px-5 py-2.5 text-right font-medium">Oldest wait</th>
          </tr>
        </thead>
        <tbody>
          {queues.map((queue) => (
            <tr
              key={queue.name}
              data-testid="workload-row"
              onClick={() => navigate(`/queue/${encodeURIComponent(queue.name)}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  navigate(`/queue/${encodeURIComponent(queue.name)}`);
                }
              }}
              className="cursor-pointer border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3">
                <span className="flex items-center gap-2 font-medium text-content-emphasis">
                  {queue.display_name || queue.name}
                  {queue.is_paused && (
                    <StatusBadge variant="neutral" icon={CirclePause}>
                      paused
                    </StatusBadge>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-content-default">
                {(queue.counts.waiting ?? 0) +
                  (queue.counts.prioritized ?? 0) +
                  (queue.counts.paused ?? 0)}
              </td>
              <td
                className={cn('px-4 py-3 text-right font-mono', {
                  'text-content-error': (queue.counts.failed ?? 0) > 0,
                  'text-content-muted': (queue.counts.failed ?? 0) === 0,
                })}
              >
                {queue.counts.failed ?? 0}
              </td>
              <td
                className={cn('px-4 py-3 text-right font-mono', {
                  'text-content-default': queue.worker_count > 0,
                  'text-content-error': queue.worker_count === 0 && !queue.is_paused,
                })}
              >
                {queue.worker_count}
              </td>
              <td className="px-5 py-3 text-right font-mono text-content-subtle">
                {formatWait(queue.oldest_waiting_ms)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatWait(waitMs: number | null): string {
  if (waitMs === null) {
    return '—';
  }
  if (waitMs < 10_000) {
    return 'a few seconds';
  }
  if (waitMs < 60_000) {
    return `${Math.round(waitMs / 1000)}s`;
  }
  if (waitMs < 3_600_000) {
    return `${Math.round(waitMs / 60_000)}m`;
  }
  return `${Math.round(waitMs / 3_600_000)}h`;
}
