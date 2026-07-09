import { CirclePause } from 'lucide-react';
import { Link } from 'react-router';
import { StatusBadge } from '../../../components/status-badge';
import type { AppQueue, JobStatus } from '../../../lib/api-types';

interface QueueCardProps {
  queue: AppQueue;
}

export function QueueCard(props: QueueCardProps) {
  const { queue } = props;
  const jobStatuses = queue.statuses.filter(
    (status): status is JobStatus => status !== 'latest',
  );

  return (
    <Link
      to={`/queue/${encodeURIComponent(queue.name)}`}
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-bg-default p-5 transition-all hover:drop-shadow-card-hover"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-semibold text-content-emphasis">
          {queue.display_name || queue.name}
        </span>
        {queue.is_paused && (
          <StatusBadge variant="neutral" icon={CirclePause}>
            paused
          </StatusBadge>
        )}
      </div>
      {queue.description && (
        <p className="text-sm text-content-subtle">{queue.description}</p>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {jobStatuses.map((status) => (
          <div key={status} className="flex flex-col gap-0.5">
            <span className="font-mono text-lg font-medium leading-6 text-content-emphasis">
              {queue.counts[status] ?? 0}
            </span>
            <span className="text-xs text-content-subtle">{status}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
