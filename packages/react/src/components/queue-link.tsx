import { cn } from '@superbull/ui';
import { NavLink } from 'react-router';
import type { AppQueue } from '../lib/api-types';

interface QueueLinkProps {
  queue: AppQueue;
}

export function QueueLink(props: QueueLinkProps) {
  const { queue } = props;
  const failedCount = queue.counts.failed ?? 0;
  const backlogCount = (queue.counts.waiting ?? 0) + (queue.counts.delayed ?? 0);

  return (
    <NavLink
      to={`/queue/${encodeURIComponent(queue.name)}`}
      className={({ isActive }) =>
        cn(
          'flex h-8 items-center gap-2 rounded-md px-2.5 text-2sm text-content-subtle transition-colors duration-150 ease-snout hover:bg-bg-subtle',
          { 'bg-blue-50 font-medium text-blue-600 hover:bg-blue-50': isActive },
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="flex size-4 shrink-0 items-center justify-center">
            <span
              className={cn('size-1.5 rounded-full', {
                'bg-blue-600': isActive,
                'bg-content-warning': !isActive && queue.is_paused,
                'bg-red-500': !isActive && !queue.is_paused && failedCount > 0,
                'bg-candy-green': !isActive && !queue.is_paused && failedCount === 0,
              })}
            />
          </span>
          <span className="min-w-0 flex-1 truncate">{queue.display_name || queue.name}</span>
          <span
            aria-label={failedCount > 0 ? `${failedCount} failed` : undefined}
            title={failedCount > 0 ? `${failedCount} failed` : undefined}
            className={cn(
              'flex min-w-6 items-center justify-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums',
              {
                'bg-bg-error text-content-error': failedCount > 0,
                'bg-bg-subtle text-content-muted': failedCount === 0,
              },
            )}
          >
            {failedCount > 0 && (
              <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-content-error" />
            )}
            {failedCount > 0 ? failedCount : backlogCount}
          </span>
        </>
      )}
    </NavLink>
  );
}
