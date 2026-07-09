import type { AppQueue, QueueStatus } from '../../../lib/api-types';
import { getJobStatus } from '../../../lib/get-job-status';
import { JobRow } from './job-row';

interface JobTableProps {
  queue: AppQueue;
  selectedStatus: QueueStatus;
  selectedIds: Set<string>;
  onToggle: (jobId: string) => void;
  onToggleAll: (jobIds: string[]) => void;
}

export function JobTable(props: JobTableProps) {
  const { queue, selectedStatus, selectedIds, onToggle, onToggleAll } = props;
  const selectableIds = queue.jobs.filter((job) => job.id != null).map((job) => String(job.id));
  const allSelected = selectableIds.length > 0 && selectedIds.size === selectableIds.length;

  if (queue.jobs.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-default px-4 py-16 text-center text-sm text-content-subtle">
        No jobs in this queue.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-default">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-content-subtle">
            <th className="w-12 px-4 py-2.5">
              <input
                type="checkbox"
                aria-label="Select all jobs"
                checked={allSelected}
                onChange={() => onToggleAll(selectableIds)}
                className="size-4 rounded border-border-default"
              />
            </th>
            <th className="px-4 py-2.5 font-medium">Job</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Created</th>
            <th className="px-4 py-2.5 font-medium">Attempts</th>
            <th className="w-24 px-4 py-2.5" />
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
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
