import { Button, JobStatusBadge, cn } from '@bullwatch/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { useRetryJob } from '../../../hooks/use-retry-job';
import type { AppJob, JobStatus } from '../../../lib/api-types';
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
  const navigate = useNavigate();
  const retryJob = useRetryJob();
  const jobId = job.id != null ? String(job.id) : null;
  const jobUrl = jobId
    ? `/queue/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`
    : null;

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (!jobUrl) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input')) {
      return;
    }
    navigate(jobUrl);
  };

  return (
    <tr
      data-testid="job-row"
      onClick={handleRowClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && jobUrl) {
          navigate(jobUrl);
        }
      }}
      className={cn(
        'group cursor-pointer border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted',
        { 'bg-brand-tint/50 hover:bg-brand-tint/50': selected },
      )}
    >
      {showActions && (
        <td className="px-3 py-2">
          <input
            type="checkbox"
            aria-label={`Select job ${jobId ?? ''}`}
            disabled={jobId === null}
            checked={selected}
            onChange={() => jobId && onToggle(jobId)}
            className="size-3.5 rounded border-border-default text-brand-deep focus:ring-0 focus:ring-offset-0"
          />
        </td>
      )}
      <td className="max-w-64 px-3 py-2">
        <div className="flex flex-col">
          <span className="flex items-baseline gap-2">
            <span title={job.name} className="truncate text-2sm font-medium text-content-emphasis">
              {job.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-content-muted">
              #{jobId ?? '—'}
            </span>
          </span>
          {status === 'failed' && job.failed_reason && (
            <span title={job.failed_reason} className="mt-0.5 truncate text-xs text-content-error">
              {job.failed_reason}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <JobStatusBadge status={status} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-2sm text-content-subtle">
        {formatDistanceToNowStrict(job.timestamp, { addSuffix: true })}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-content-subtle">
        {formatDuration(job)}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn('font-mono text-xs tabular-nums text-content-subtle', {
            'text-content-attention': job.attempts > 1,
          })}
        >
          {job.attempts}
        </span>
      </td>
      {showActions && (
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {status === 'failed' && jobId && (
              <Button
                variant="secondary"
                className="h-7 px-2 text-xs"
                icon={<RotateCcw className="size-3" />}
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
