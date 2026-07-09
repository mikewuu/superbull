import { format } from 'date-fns';
import { ArrowLeft, ArrowUpCircle, RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/button';
import { JobStatusBadge } from '../../components/job-status-badge';
import { PageHeader } from '../../components/page-header';
import { useJob } from '../../hooks/use-job';
import { usePromoteJob } from '../../hooks/use-promote-job';
import { useRemoveJob } from '../../hooks/use-remove-job';
import { useRetryJob } from '../../hooks/use-retry-job';
import { JobLogsPanel } from './_components/job-logs-panel';
import { JsonPanel } from './_components/json-panel';

export function JobDetailPage() {
  const { queueName = '', jobId = '' } = useParams();
  const navigate = useNavigate();
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
        <p className="px-6 py-6 text-sm text-content-subtle">Loading…</p>
      </>
    );
  }

  const { job, status } = data;

  return (
    <>
      <PageHeader
        title={
          <>
            <Link to={backLink} className="text-content-muted hover:text-content-emphasis">
              <ArrowLeft className="size-5" />
            </Link>
            <span className="truncate">{job.name}</span>
            <JobStatusBadge status={status} />
          </>
        }
        controls={
          <>
            <Button
              variant="secondary"
              className="h-8 px-2.5 text-xs"
              icon={<RotateCcw className="size-3.5" />}
              text="Retry"
              loading={retryJob.isPending}
              onClick={() => retryJob.mutate({ queueName, jobId })}
            />
            {status === 'delayed' && (
              <Button
                variant="secondary"
                className="h-8 px-2.5 text-xs"
                icon={<ArrowUpCircle className="size-3.5" />}
                text="Promote"
                loading={promoteJob.isPending}
                onClick={() => promoteJob.mutate({ queueName, jobId })}
              />
            )}
            <Button
              variant="danger-outline"
              className="h-8 px-2.5 text-xs"
              icon={<Trash2 className="size-3.5" />}
              text="Remove"
              loading={removeJob.isPending}
              onClick={() =>
                removeJob.mutate({ queueName, jobId }, { onSuccess: () => navigate(backLink) })
              }
            />
          </>
        }
      />
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-3 py-6 lg:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-border-subtle bg-bg-default p-5 md:grid-cols-4">
          <MetaItem label="ID" value={<span className="font-mono">#{jobId}</span>} />
          <MetaItem label="Attempts" value={<span className="font-mono">{job.attempts}</span>} />
          <MetaItem label="Created" value={format(job.timestamp, 'PP pp')} />
          <MetaItem
            label="Finished"
            value={job.finished_on ? format(job.finished_on, 'PP pp') : '—'}
          />
        </div>
        <JsonPanel title="Data" value={job.data} />
        <JsonPanel title="Options" value={job.opts} />
        {job.return_value != null && <JsonPanel title="Return value" value={job.return_value} />}
        {job.failed_reason && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-content-error">Failed reason</h2>
            <pre className="overflow-x-auto rounded-xl border border-red-200 bg-bg-error/40 p-4 font-mono text-xs text-content-error">
              {job.failed_reason}
              {job.stacktrace.length > 0 && `\n\n${job.stacktrace.join('\n')}`}
            </pre>
          </section>
        )}
        <JobLogsPanel queueName={queueName} jobId={jobId} />
      </div>
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
