import { formatDistanceToNowStrict } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../../components/button';
import { JobStatusBadge } from '../../../components/job-status-badge';
import { useRetryJob } from '../../../hooks/use-retry-job';
import type { AppJob, JobStatus } from '../../../lib/api-types';
import { cn } from '../../../lib/cn';
import { JobActionsMenu } from './job-actions-menu';

interface JobRowProps {
  queueName: string;
  job: AppJob;
  status: JobStatus;
  selected: boolean;
  showActions: boolean;
  onToggle: (jobId: string) => void;
}

export function JobRow(props: JobRowProps) {
  const { queueName, job, status, selected, showActions, onToggle } = props;
  const retryJob = useRetryJob();
  const jobId = job.id != null ? String(job.id) : null;

  return (
    <tr
      data-testid="job-row"
      className={cn(
        'group border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted',
        { 'bg-blue-50/60 hover:bg-blue-50/60': selected },
      )}
    >
      {showActions && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            aria-label={`Select job ${jobId ?? ''}`}
            disabled={jobId === null}
            checked={selected}
            onChange={() => jobId && onToggle(jobId)}
            className="size-4 rounded border-border-default text-black focus:ring-0 focus:ring-offset-0"
          />
        </td>
      )}
      <td className="max-w-72 px-4 py-3">
        {jobId ? (
          <Link
            to={`/queue/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`}
            className="flex flex-col"
          >
            <span className="truncate font-medium text-content-emphasis group-hover:underline group-hover:decoration-border-emphasis group-hover:underline-offset-2">
              {job.name}
            </span>
            <span className="font-mono text-xs text-content-muted">#{jobId}</span>
            {status === 'failed' && job.failed_reason && (
              <span className="mt-0.5 truncate text-xs text-content-error">
                {job.failed_reason}
              </span>
            )}
          </Link>
        ) : (
          <span className="font-medium text-content-emphasis">{job.name}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <JobStatusBadge status={status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-content-subtle">
        {formatDistanceToNowStrict(job.timestamp, { addSuffix: true })}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-content-subtle">
        {formatDuration(job)}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn('font-mono text-xs text-content-subtle', {
            'text-content-attention': job.attempts > 1,
          })}
        >
          {job.attempts}
        </span>
      </td>
      {showActions && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {status === 'failed' && jobId && (
              <Button
                variant="secondary"
                className="h-8 px-2.5 text-xs"
                icon={<RotateCcw className="size-3.5" />}
                text="Retry"
                loading={retryJob.isPending}
                onClick={() => retryJob.mutate({ queueName, jobId })}
              />
            )}
            {jobId && <JobActionsMenu queueName={queueName} jobId={jobId} status={status} />}
          </div>
        </td>
      )}
    </tr>
  );
}

function formatDuration(job: AppJob): string {
  if (!job.processed_on) {
    return '—';
  }
  const endMs = job.finished_on ?? Date.now();
  const durationMs = endMs - job.processed_on;
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  return `${Math.round(durationMs / 60_000)}m`;
}
