import { formatComputeTime } from '../../../../../lib/analytics/format-compute-time';
import type { QueueTotal } from '../../../../../lib/analytics/types';

interface QueueTotalsTableProps {
  totals: QueueTotal[];
}

export function QueueTotalsTable(props: QueueTotalsTableProps) {
  const { totals } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Queue</th>
            <th className="w-28 px-4 py-2.5 text-right font-medium">Completed</th>
            <th className="w-28 px-4 py-2.5 text-right font-medium">Failed</th>
            <th className="w-32 px-5 py-2.5 text-right font-medium">Compute time</th>
          </tr>
        </thead>
        <tbody>
          {totals.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-6 text-center text-content-muted">
                No queue activity in this range.
              </td>
            </tr>
          )}
          {totals.map((total) => (
            <tr
              key={total.queue_name}
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3 font-medium text-content-emphasis">{total.queue_name}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-content-default">
                {total.completed.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-content-error">
                {total.failed.toLocaleString()}
              </td>
              <td className="px-5 py-3 text-right font-mono tabular-nums text-content-default">
                {total.job_seconds === null ? '-' : formatComputeTime(total.job_seconds)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
