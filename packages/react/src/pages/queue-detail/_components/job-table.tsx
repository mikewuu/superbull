import { EmptyState } from '@bullwatch/ui';
import { ArrowDown, ArrowUp, Inbox } from 'lucide-react';
import type { AppQueue, QueueStatus } from '../../../lib/api-types';
import { getJobStatus } from '../../../lib/get-job-status';
import { JobRow } from './job-row';

interface JobTableProps {
  queue: AppQueue;
  selectedStatus: QueueStatus;
  selectedIds: Set<string>;
  sortOrder: 'asc' | 'desc';
  onToggle: (jobId: string) => void;
  onToggleAll: (jobIds: string[]) => void;
  onSortChange: (order: 'asc' | 'desc') => void;
}

export function JobTable(props: JobTableProps) {
  const { queue, selectedStatus, selectedIds, sortOrder, onToggle, onToggleAll, onSortChange } =
    props;
  const selectableIds = queue.jobs.filter((job) => job.id != null).map((job) => String(job.id));
  const allSelected = selectableIds.length > 0 && selectedIds.size === selectableIds.length;
  const showActions = !queue.read_only_mode;

  if (queue.jobs.length === 0) {
    return (
      <div data-testid="job-table" className="candy-card rounded-lg">
        <EmptyState
          icon={Inbox}
          title={selectedStatus === 'latest' ? 'No jobs yet' : `No ${selectedStatus} jobs`}
          description={
            selectedStatus === 'latest'
              ? 'Jobs added to this queue will show up here.'
              : 'Try another status tab.'
          }
        />
      </div>
    );
  }

  return (
    <div data-testid="job-table" className="candy-card overflow-x-auto rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            {showActions && (
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all jobs"
                  checked={allSelected}
                  onChange={() => onToggleAll(selectableIds)}
                  className="size-3.5 rounded border-border-default text-brand-deep focus:ring-0 focus:ring-offset-0"
                />
              </th>
            )}
            <th className="px-3 py-2.5 font-medium">Job</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">
              <button
                type="button"
                data-testid="sort-created"
                onClick={() => onSortChange(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1 font-medium text-content-subtle hover:text-content-emphasis"
              >
                Created
                {sortOrder === 'desc' ? (
                  <ArrowDown className="size-3" />
                ) : (
                  <ArrowUp className="size-3" />
                )}
              </button>
            </th>
            <th className="px-3 py-2.5 font-medium">Duration</th>
            <th className="px-3 py-2.5 font-medium">Attempts</th>
            {showActions && <th className="w-24 px-3 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {queue.jobs.map((job) => (
            <JobRow
              key={String(job.id)}
              queueName={queue.name}
              job={job}
              status={getJobStatus(job, selectedStatus)}
              selected={job.id != null && selectedIds.has(String(job.id))}
              showActions={showActions}
              allowRetries={queue.allow_retries}
              allowCompletedRetries={queue.allow_completed_retries}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
