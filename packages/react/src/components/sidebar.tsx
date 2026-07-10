import { Activity, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router';
import { useQueues } from '../hooks/use-queues';
import { useRedisStats } from '../hooks/use-redis-stats';
import type { AppQueue } from '../lib/api-types';
import { cn } from '../lib/cn';

export function Sidebar() {
  const { data: queues } = useQueues({});
  const { data: redisStats } = useRedisStats();

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3 p-3">
      <div className="flex h-10 items-center gap-2.5 px-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-bg-inverted">
          <Activity className="size-4 text-content-inverted" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-content-emphasis">
          bullwatch
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto rounded-xl bg-neutral-100 p-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-content-default hover:bg-neutral-200/60',
              { 'bg-white text-content-emphasis shadow-sm hover:bg-white': isActive },
            )
          }
        >
          <LayoutGrid className="size-4 shrink-0" />
          Overview
        </NavLink>

        <span className="px-2.5 pb-1.5 pt-4 text-xs font-medium uppercase tracking-wide text-content-muted">
          Queues
        </span>
        {queues?.map((queue) => (
          <QueueLink key={queue.name} queue={queue} />
        ))}
      </nav>

      <div className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2.5">
        <span className="relative flex size-2">
          <span
            className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', {
              'bg-green-400': redisStats,
              'bg-red-400': !redisStats,
            })}
          />
          <span
            className={cn('relative inline-flex size-2 rounded-full', {
              'bg-green-500': redisStats,
              'bg-red-500': !redisStats,
            })}
          />
        </span>
        <span className="text-xs text-content-subtle">
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
          'flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-content-default hover:bg-neutral-200/60',
          { 'bg-white font-medium text-content-emphasis shadow-sm hover:bg-white': isActive },
        )
      }
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', {
          'bg-red-500': failedCount > 0,
          'bg-green-500': failedCount === 0,
        })}
      />
      <span className="min-w-0 flex-1 truncate">{queue.display_name || queue.name}</span>
      {failedCount > 0 ? (
        <span className="rounded-md bg-bg-error px-1.5 py-0.5 font-mono text-xs text-content-error">
          {failedCount}
        </span>
      ) : (
        <span className="font-mono text-xs text-content-muted">{backlogCount}</span>
      )}
    </NavLink>
  );
}
