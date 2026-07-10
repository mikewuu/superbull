import { CirclePause } from 'lucide-react';
import { Link } from 'react-router';
import { StatusBadge } from '../../../components/status-badge';
import type { AppQueue } from '../../../lib/api-types';
import { cn } from '../../../lib/cn';

const countOrder = ['active', 'waiting', 'delayed', 'completed', 'failed'] as const;

interface QueueCardProps {
  queue: AppQueue;
}

export function QueueCard(props: QueueCardProps) {
  const { queue } = props;

  return (
    <Link
      to={`/queue/${encodeURIComponent(queue.name)}`}
      className="group flex flex-col gap-4 rounded-xl border border-neutral-200 bg-bg-default p-5 transition-all hover:border-border-default hover:drop-shadow-card-hover"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-semibold tracking-tight text-content-emphasis">
          {queue.display_name || queue.name}
        </span>
        {queue.is_paused && (
          <StatusBadge variant="neutral" icon={CirclePause}>
            paused
          </StatusBadge>
        )}
      </div>

      {queue.description && (
        <p className="-mt-2 truncate text-sm text-content-subtle">{queue.description}</p>
      )}

      <div className="grid grid-cols-5 gap-2">
        {countOrder.map((status) => {
          const count = queue.counts[status] ?? 0;
          return (
            <div
              key={status}
              className={cn('flex flex-col gap-0.5 rounded-lg bg-bg-muted px-2.5 py-2', {
                'bg-bg-error/60': status === 'failed' && count > 0,
                'bg-bg-info/60': status === 'active' && count > 0,
              })}
            >
              <span
                className={cn('font-mono text-base font-medium leading-6 text-content-emphasis', {
                  'text-content-error': status === 'failed' && count > 0,
                  'text-content-info': status === 'active' && count > 0,
                })}
              >
                {count.toLocaleString()}
              </span>
              <span className="truncate text-xs text-content-subtle">{status}</span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
