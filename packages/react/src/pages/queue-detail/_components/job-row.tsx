import { formatDistanceToNow } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../../components/button';
import { JobStatusBadge } from '../../../components/job-status-badge';
import { useRetryJob } from '../../../hooks/use-retry-job';
import type { AppJob, JobStatus } from '../../../lib/api-types';
import { JobActionsMenu } from './job-actions-menu';

interface JobRowProps {
  queueName: string;
  job: AppJob;
  status: JobStatus;
  selected: boolean;
  onToggle: (jobId: string) => void;
}

export function JobRow(props: JobRowProps) {
  const { queueName, job, status, selected, onToggle } = props;
  const retryJob = useRetryJob();
  const jobId = job.id != null ? String(job.id) : null;

  return (
    <tr className="border-b border-border-subtle last:border-b-0 hover:bg-bg-muted">
      <td className="px-4 py-2.5">
        <input
          type="checkbox"
          aria-label={`Select job ${jobId ?? ''}`}
          disabled={jobId === null}
          checked={selected}
          onChange={() => jobId && onToggle(jobId)}
          className="size-4 rounded border-border-default"
        />
      </td>
      <td className="px-4 py-2.5">
        {jobId ? (
          <Link
            to={`/queue/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`}
            className="flex flex-col"
          >
            <span className="font-medium text-content-emphasis">{job.name}</span>
            <span className="font-mono text-xs text-content-muted">#{jobId}</span>
          </Link>
        ) : (
          <span className="font-medium text-content-emphasis">{job.name}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <JobStatusBadge status={status} />
      </td>
      <td className="px-4 py-2.5 text-content-subtle">
        {formatDistanceToNow(job.timestamp, { addSuffix: true })}
      </td>
      <td className="px-4 py-2.5 font-mono text-content-subtle">{job.attempts}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1">
          {status === 'failed' && jobId && (
            <Button
              variant="secondary"
              className="h-8 px-2 text-xs"
              icon={<RotateCcw className="size-3.5" />}
              text="Retry"
              loading={retryJob.isPending}
              onClick={() => retryJob.mutate({ queueName, jobId })}
            />
          )}
          {jobId && <JobActionsMenu queueName={queueName} jobId={jobId} status={status} />}
        </div>
      </td>
    </tr>
  );
}
