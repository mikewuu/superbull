import { Activity, LayoutGrid, ListTodo } from 'lucide-react';
import { NavLink } from 'react-router';
import { useQueues } from '../hooks/use-queues';
import type { JobStatus } from '../lib/api-types';
import { cn } from '../lib/cn';

export function Sidebar() {
  const { data: queues } = useQueues({});

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3 border-r border-border-subtle p-3">
      <div className="flex h-10 items-center gap-2.5 px-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-bg-inverted">
          <Activity className="size-4 text-content-inverted" />
        </span>
        <span className="text-sm font-semibold text-content-emphasis">bullwatch</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto rounded-xl bg-neutral-100 p-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-content-default hover:bg-neutral-200/60',
              { 'bg-blue-100/50 text-blue-600 hover:bg-blue-100/50': isActive },
            )
          }
        >
          <LayoutGrid className="size-4 shrink-0" />
          Overview
        </NavLink>
        <span className="px-2.5 pb-1 pt-3 text-xs font-medium text-content-muted">Queues</span>
        {queues?.map((queue) => (
          <NavLink
            key={queue.name}
            to={`/queue/${encodeURIComponent(queue.name)}`}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-content-default hover:bg-neutral-200/60',
                { 'bg-blue-100/50 text-blue-600 hover:bg-blue-100/50': isActive },
              )
            }
          >
            <ListTodo className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{queue.display_name || queue.name}</span>
            <span className="font-mono text-xs text-content-muted">{sumCounts(queue.counts)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function sumCounts(counts: Record<JobStatus, number>): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}
