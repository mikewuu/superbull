import { Popover, cn } from '@superbull/ui';
import { Check, ChevronDown, ListFilter, X } from 'lucide-react';
import { useState } from 'react';
import { type AppQueue, type JobStatus, jobStatuses } from '../../../lib/api-types';

interface StatusFilterProps {
  queue: AppQueue;
  statuses: JobStatus[];
  onChange: (statuses: JobStatus[]) => void;
}

export function StatusFilter(props: StatusFilterProps) {
  const { queue, statuses, onChange } = props;
  const [showing, setShowing] = useState(false);
  const options = queue.statuses.filter(
    (value): value is JobStatus => value !== 'latest' && jobStatuses.includes(value as JobStatus),
  );
  const totalCount = Object.values(queue.counts).reduce((total, value) => total + value, 0);

  const toggle = (status: JobStatus) => {
    if (statuses.includes(status)) {
      onChange(statuses.filter((value) => value !== status));
    } else {
      onChange([...statuses, status]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover
        showing={showing}
        onShowingChange={setShowing}
        trigger={
          <button
            type="button"
            data-testid="status-filter-button"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border-default bg-white px-2.5 text-2sm text-content-default hover:bg-bg-muted"
          >
            <ListFilter className="size-3.5 text-content-muted" />
            Status
            <ChevronDown className="size-3.5 text-content-muted" />
          </button>
        }
      >
        <div className="flex min-w-52 flex-col">
          <button
            type="button"
            data-testid="status-tab-latest"
            onClick={() => {
              setShowing(false);
              onChange([]);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-2sm text-content-default hover:bg-bg-muted"
          >
            <span className="flex size-4 items-center justify-center">
              {statuses.length === 0 && <Check className="size-3.5 text-content-emphasis" />}
            </span>
            <span className="flex-1">All statuses</span>
            <span className="font-mono text-xs tabular-nums text-content-muted">
              {totalCount.toLocaleString()}
            </span>
          </button>
          {options.map((option) => {
            const isSelected = statuses.includes(option);
            const count = queue.counts[option] ?? 0;
            return (
              <button
                key={option}
                type="button"
                data-testid={`status-tab-${option}`}
                onClick={() => toggle(option)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-2sm text-content-default hover:bg-bg-muted"
              >
                <span className="flex size-4 items-center justify-center">
                  {isSelected && <Check className="size-3.5 text-content-emphasis" />}
                </span>
                <span className="flex-1">{option}</span>
                <span
                  className={cn('font-mono text-xs tabular-nums text-content-muted', {
                    'text-content-error': option === 'failed' && count > 0,
                  })}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </Popover>

      {statuses.map((status) => (
        <span
          key={status}
          data-testid={`applied-status-${status}`}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-bg-subtle px-2.5 text-2sm text-content-emphasis"
        >
          <span className="text-content-muted">Status:</span>
          {status}
          <button
            type="button"
            aria-label={`Remove ${status} filter`}
            onClick={() => onChange(statuses.filter((value) => value !== status))}
            className="rounded p-0.5 text-content-muted hover:text-content-emphasis"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
