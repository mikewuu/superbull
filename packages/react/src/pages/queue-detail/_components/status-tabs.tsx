import type { AppQueue, JobStatus, QueueStatus } from '../../../lib/api-types';
import { cn } from '../../../lib/cn';

interface StatusTabsProps {
  queue: AppQueue;
  status: QueueStatus;
  onChange: (status: QueueStatus) => void;
}

export function StatusTabs(props: StatusTabsProps) {
  const { queue, status, onChange } = props;
  const tabs: QueueStatus[] = ['latest', ...queue.statuses.filter((value) => value !== 'latest')];

  return (
    <div className="flex max-w-full items-center gap-1 overflow-x-auto border-b border-border-subtle">
      {tabs.map((tab) => {
        const isActive = tab === status;
        const count = tab === 'latest' ? null : (queue.counts[tab as JobStatus] ?? 0);
        return (
          <button
            key={tab}
            type="button"
            data-testid={`status-tab-${tab}`}
            onClick={() => onChange(tab)}
            className={cn(
              '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 pb-2.5 pt-1 text-sm text-content-subtle transition-colors hover:text-content-emphasis',
              { 'border-black font-medium text-content-emphasis': isActive },
            )}
          >
            {tab === 'latest' ? 'All' : tab}
            {count !== null && count > 0 && (
              <span
                className={cn('rounded-md bg-bg-subtle px-1.5 py-0.5 font-mono text-xs', {
                  'bg-bg-error text-content-error': tab === 'failed',
                  'bg-bg-info text-content-info': tab === 'active',
                })}
              >
                {count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
