import { Button, ConfirmDialog, JobStatusBadge, PageHeader, Skeleton } from '@bullwatch/ui';
import { ArrowUpCircle, Pencil, RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumbs } from '../../components/breadcrumbs';
import { useJob } from '../../hooks/use-job';
import { usePromoteJob } from '../../hooks/use-promote-job';
import { useRemoveJob } from '../../hooks/use-remove-job';
import { useReplayJob } from '../../hooks/use-replay-job';
import { useRetryJob } from '../../hooks/use-retry-job';
import { AttemptsPanel } from './_components/attempts-panel';
import { ErrorSection } from './_components/error-section';
import { JobLogsPanel } from './_components/job-logs-panel';
import { JsonPanel } from './_components/json-panel';
import { PropertiesPanel } from './_components/properties-panel';
import { ReplayJobDialog } from './_components/replay-job-dialog';
import { TimelineWaterfall } from './_components/timeline-waterfall';
import { TimingSidebar } from './_components/timing-sidebar';

export function JobDetailPage() {
  const { queueName = '', jobId = '' } = useParams();
  const navigate = useNavigate();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [showingReplayDialog, setShowingReplayDialog] = useState(false);
  const { data, error } = useJob({ queueName, jobId });
  const retryJob = useRetryJob();
  const promoteJob = usePromoteJob();
  const removeJob = useRemoveJob();
  const replayJob = useReplayJob();

  useEffect(() => {
    const currentJob = data?.job;
    if (!currentJob) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (event.key.toLowerCase() === 'r') {
        replayJob.mutate({ queueName, jobName: currentJob.name, data: currentJob.data });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queueName, data, replayJob]);

  const backLink = `/queue/${encodeURIComponent(queueName)}`;

  if (error) {
    return (
      <>
        <PageHeader title={`Job #${jobId}`} />
        <p className="px-6 py-6 text-2sm text-content-error">Failed to load job: {error.message}</p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title={`Job #${jobId}`} />
        <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </>
    );
  }

  const { job, status } = data;
  const priority = getPriority(job.opts);

  return (
    <>
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: 'Queues', to: '/' },
              { label: queueName, to: backLink },
              {
                label: (
                  <>
                    <span className="truncate">{job.name}</span>
                    <span className="font-mono text-2sm font-normal text-content-muted">
                      #{jobId}
                    </span>
                    <JobStatusBadge status={status} />
                  </>
                ),
              },
            ]}
          />
        }
        controls={
          <>
            <Button
              variant="secondary"
              className="h-8 text-xs"
              icon={<RotateCcw className="size-3.5" />}
              text="Retry"
              loading={retryJob.isPending}
              onClick={() => retryJob.mutate({ queueName, jobId })}
            />
            {status === 'delayed' && (
              <Button
                variant="secondary"
                className="h-8 text-xs"
                icon={<ArrowUpCircle className="size-3.5" />}
                text="Promote"
                loading={promoteJob.isPending}
                onClick={() => promoteJob.mutate({ queueName, jobId })}
              />
            )}
            <Button
              variant="secondary"
              className="h-8 text-xs"
              icon={<RefreshCcw className="size-3.5" />}
              text="Replay"
              aria-label="Replay job"
              loading={replayJob.isPending}
              onClick={() => replayJob.mutate({ queueName, jobName: job.name, data: job.data })}
            />
            <Button
              variant="secondary"
              className="h-8 w-8 justify-center p-0"
              icon={<Pencil className="size-3.5" />}
              aria-label="Edit and resend job"
              onClick={() => setShowingReplayDialog(true)}
            />
            <Button
              variant="danger-outline"
              className="h-8 text-xs"
              icon={<Trash2 className="size-3.5" />}
              text="Remove"
              onClick={() => setConfirmingRemove(true)}
            />
          </>
        }
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:px-6">
        <div className="candy-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg">
          <TimelineWaterfall
            timestamp={job.timestamp}
            processedOn={job.processed_on}
            finishedOn={job.finished_on}
            failed={status === 'failed'}
          />
          {job.failed_reason && (
            <ErrorSection failedReason={job.failed_reason} stacktrace={job.stacktrace} />
          )}
          {job.attempts > 1 && <AttemptsPanel stacktrace={job.stacktrace} />}
          <JobLogsPanel queueName={queueName} jobId={jobId} />
        </div>

        <div className="candy-card w-full shrink-0 divide-y divide-border-subtle self-start rounded-lg lg:w-[26rem]">
          <div className="px-4 py-3">
            <JobStatusBadge status={status} />
          </div>
          <TimingSidebar
            timestamp={job.timestamp}
            processedOn={job.processed_on}
            finishedOn={job.finished_on}
            failed={status === 'failed'}
          />
          <PropertiesPanel
            jobId={jobId}
            attempts={job.attempts}
            delayMs={job.delay}
            priority={priority}
          />
          <JsonPanel title="Data" copyLabel="Copy payload" value={job.data} />
          <JsonPanel title="Options" copyLabel="Copy options" value={job.opts} />
          {job.return_value != null && (
            <JsonPanel title="Return value" copyLabel="Copy output" value={job.return_value} />
          )}
        </div>
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

      <ReplayJobDialog
        queueName={queueName}
        jobName={job.name}
        initialData={job.data}
        showing={showingReplayDialog}
        onClose={() => setShowingReplayDialog(false)}
      />
    </>
  );
}

function getPriority(opts: object): number | undefined {
  if ('priority' in opts && typeof opts.priority === 'number') {
    return opts.priority;
  }
  return undefined;
}
