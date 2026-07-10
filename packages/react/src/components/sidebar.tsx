import { cn } from '@bullwatch/ui';
import { Activity, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router';
import { useQueues } from '../hooks/use-queues';
import { useRedisStats } from '../hooks/use-redis-stats';
import type { AppQueue } from '../lib/api-types';

export function Sidebar() {
  const { data: queues } = useQueues({});
  const { data: redisStats } = useRedisStats();

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-border-subtle bg-bg-default p-3">
      <div className="flex h-10 items-center gap-2.5 px-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-bg-inverted">
          <Activity className="size-4 text-content-inverted" />
        </span>
        <span className="text-2sm font-semibold tracking-tight text-content-emphasis">
          bullwatch
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        <span className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-content-muted">
          Main
        </span>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-2sm text-content-subtle transition-colors duration-150 ease-snout hover:bg-bg-subtle',
              { 'bg-blue-50 font-medium text-blue-600 hover:bg-blue-50': isActive },
            )
          }
        >
          <LayoutGrid className="size-4 shrink-0" />
          Overview
        </NavLink>

        <span className="px-2.5 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-wide text-content-muted">
          Queues
        </span>
        {queues?.map((queue) => (
          <QueueLink key={queue.name} queue={queue} />
        ))}
      </nav>

      <div className="candy-card flex items-center gap-2 rounded-lg px-3 py-2.5">
        <span className="relative flex size-2">
          <span
            className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', {
              'bg-candy-green': redisStats,
              'bg-red-400': !redisStats,
            })}
          />
          <span
            className={cn('relative inline-flex size-2 rounded-full', {
              'bg-candy-green': redisStats,
              'bg-red-500': !redisStats,
            })}
          />
        </span>
        <span className="text-2sm text-content-subtle">
          {redisStats ? `Redis ${redisStats.version ?? ''}` : 'Connecting…'}
        </span>
      </div>
    </aside>
  );
}

function QueueLink(props: { queue: AppQueue }) {
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
                'bg-red-500': !isActive && failedCount > 0,
                'bg-candy-green': !isActive && failedCount === 0,
              })}
            />
          </span>
          <span className="min-w-0 flex-1 truncate">{queue.display_name || queue.name}</span>
          <span
            className={cn(
              'flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums',
              {
                'bg-bg-error text-content-error': failedCount > 0,
                'bg-bg-subtle text-content-muted': failedCount === 0,
              },
            )}
          >
            {failedCount > 0 ? failedCount : backlogCount}
          </span>
        </>
      )}
    </NavLink>
  );
}
