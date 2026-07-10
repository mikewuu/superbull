import { format } from 'date-fns';
import { ArrowLeft, ArrowUpCircle, RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/button';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { JobStatusBadge } from '../../components/job-status-badge';
import { PageHeader } from '../../components/page-header';
import { Skeleton } from '../../components/skeleton';
import { useJob } from '../../hooks/use-job';
import { usePromoteJob } from '../../hooks/use-promote-job';
import { useRemoveJob } from '../../hooks/use-remove-job';
import { useRetryJob } from '../../hooks/use-retry-job';
import { JobLogsPanel } from './_components/job-logs-panel';
import { JsonPanel } from './_components/json-panel';

export function JobDetailPage() {
  const { queueName = '', jobId = '' } = useParams();
  const navigate = useNavigate();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const { data, error } = useJob({ queueName, jobId });
  const retryJob = useRetryJob();
  const promoteJob = usePromoteJob();
  const removeJob = useRemoveJob();

  const backLink = `/queue/${encodeURIComponent(queueName)}`;

  if (error) {
    return (
      <>
        <PageHeader title={`Job #${jobId}`} />
        <p className="px-6 py-6 text-sm text-content-error">Failed to load job: {error.message}</p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title={`Job #${jobId}`} />
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-3 py-6 lg:px-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </>
    );
  }

  const { job, status } = data;
  const progressPercent = typeof job.progress === 'number' ? Math.min(job.progress, 100) : null;

  return (
    <>
      <PageHeader
        title={
          <>
            <Link
              to={backLink}
              aria-label="Back to queue"
              className="rounded-lg p-1 text-content-muted hover:bg-bg-muted hover:text-content-emphasis"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <span className="truncate">{job.name}</span>
            <span className="font-mono text-sm font-normal text-content-muted">#{jobId}</span>
            <JobStatusBadge status={status} />
          </>
        }
        controls={
          <>
            <Button
              variant="secondary"
              className="h-9 text-xs"
              icon={<RotateCcw className="size-3.5" />}
              text="Retry"
              loading={retryJob.isPending}
              onClick={() => retryJob.mutate({ queueName, jobId })}
            />
            {status === 'delayed' && (
              <Button
                variant="secondary"
                className="h-9 text-xs"
                icon={<ArrowUpCircle className="size-3.5" />}
                text="Promote"
                loading={promoteJob.isPending}
                onClick={() => promoteJob.mutate({ queueName, jobId })}
              />
            )}
            <Button
              variant="danger-outline"
              className="h-9 text-xs"
              icon={<Trash2 className="size-3.5" />}
              text="Remove"
              onClick={() => setConfirmingRemove(true)}
            />
          </>
        }
      />
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-3 py-6 lg:px-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border border-neutral-200 bg-bg-default p-5 sm:grid-cols-3 lg:grid-cols-6">
          <MetaItem label="ID" value={<span className="font-mono">#{jobId}</span>} />
          <MetaItem label="Attempts" value={<span className="font-mono">{job.attempts}</span>} />
          <MetaItem
            label="Delay"
            value={job.delay ? <span className="font-mono">{job.delay}ms</span> : '—'}
          />
          <MetaItem label="Created" value={format(job.timestamp, 'MMM d, HH:mm:ss')} />
          <MetaItem
            label="Started"
            value={job.processed_on ? format(job.processed_on, 'MMM d, HH:mm:ss') : '—'}
          />
          <MetaItem
            label="Finished"
            value={job.finished_on ? format(job.finished_on, 'MMM d, HH:mm:ss') : '—'}
          />
        </div>

        {progressPercent !== null && progressPercent > 0 && status === 'active' && (
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-bg-default p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-content-emphasis">Progress</span>
              <span className="font-mono text-sm text-content-emphasis">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {job.failed_reason && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-content-error">Failed reason</h2>
            <pre className="overflow-x-auto rounded-xl border border-red-200 bg-bg-error/40 p-4 font-mono text-xs leading-5 text-content-error">
              {job.failed_reason}
              {job.stacktrace.length > 0 && `\n\n${job.stacktrace.join('\n')}`}
            </pre>
          </section>
        )}

        <JsonPanel title="Data" value={job.data} />
        <JsonPanel title="Options" value={job.opts} />
        {job.return_value != null && <JsonPanel title="Return value" value={job.return_value} />}
        <JobLogsPanel queueName={queueName} jobId={jobId} />
      </div>

      <ConfirmDialog
        showing={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        title="Remove job"
        description={`Delete job #${jobId} from "${queueName}". This cannot be undone.`}
        confirmText="Remove job"
        loading={removeJob.isPending}
        onConfirm={() =>
          removeJob.mutate({ queueName, jobId }, { onSuccess: () => navigate(backLink) })
        }
      />
    </>
  );
}

function MetaItem(props: { label: string; value: ReactNode }) {
  const { label, value } = props;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-content-subtle">{label}</span>
      <span className="text-sm text-content-emphasis">{value}</span>
    </div>
  );
}
