import { Check, ChevronDown, ListFilter, X } from 'lucide-react';
import { useState } from 'react';
import { Popover } from '../../../components/popover';
import type { AppQueue, JobStatus, QueueStatus } from '../../../lib/api-types';
import { cn } from '../../../lib/cn';

interface StatusFilterProps {
  queue: AppQueue;
  status: QueueStatus;
  onChange: (status: QueueStatus) => void;
}

export function StatusFilter(props: StatusFilterProps) {
  const { queue, status, onChange } = props;
  const [showing, setShowing] = useState(false);
  const options: QueueStatus[] = [
    'latest',
    ...queue.statuses.filter((value) => value !== 'latest'),
  ];

  const pick = (next: QueueStatus) => {
    setShowing(false);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover
        showing={showing}
        onShowingChange={setShowing}
        trigger={
          <button
            type="button"
            data-testid="status-filter-button"
            className="candy-pill flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-2sm text-content-default transition-transform duration-150 ease-snout"
          >
            <ListFilter className="size-3.5 text-content-muted" />
            Status
            <ChevronDown className="size-3.5 text-content-muted" />
          </button>
        }
      >
        <div className="flex min-w-52 flex-col">
          {options.map((option) => {
            const isActive = option === status;
            const count = option === 'latest' ? null : (queue.counts[option as JobStatus] ?? 0);
            return (
              <button
                key={option}
                type="button"
                data-testid={`status-tab-${option}`}
                onClick={() => pick(option)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-2sm text-content-default hover:bg-bg-muted"
              >
                <span className="flex size-4 items-center justify-center">
                  {isActive && <Check className="size-3.5 text-content-emphasis" />}
                </span>
                <span className="flex-1">{option === 'latest' ? 'All statuses' : option}</span>
                {count !== null && (
                  <span
                    className={cn('font-mono text-xs text-content-muted', {
                      'text-content-error': option === 'failed' && count > 0,
                    })}
                  >
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Popover>

      {status !== 'latest' && (
        <span
          data-testid="applied-status"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-bg-subtle px-2.5 text-2sm text-content-emphasis"
        >
          <span className="text-content-muted">Status:</span>
          {status}
          <button
            type="button"
            aria-label="Clear status filter"
            onClick={() => onChange('latest')}
            className="rounded p-0.5 text-content-muted hover:text-content-emphasis"
          >
            <X className="size-3" />
          </button>
        </span>
      )}
    </div>
  );
}
