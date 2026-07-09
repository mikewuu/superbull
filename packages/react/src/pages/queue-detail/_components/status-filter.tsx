import type { AppQueue, JobStatus, QueueStatus } from '../../../lib/api-types';
import { cn } from '../../../lib/cn';

interface StatusFilterProps {
  queue: AppQueue;
  status: QueueStatus;
  onChange: (status: QueueStatus) => void;
}

export function StatusFilter(props: StatusFilterProps) {
  const { queue, status, onChange } = props;
  const options: QueueStatus[] = [
    'latest',
    ...queue.statuses.filter((value) => value !== 'latest'),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-content-default transition-colors hover:bg-bg-muted',
            {
              'border-transparent bg-blue-100/50 text-blue-600 hover:bg-blue-100/50':
                option === status,
            },
          )}
        >
          {option}
          {option !== 'latest' && (
            <span className="font-mono text-xs text-content-muted">
              {queue.counts[option as JobStatus] ?? 0}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
