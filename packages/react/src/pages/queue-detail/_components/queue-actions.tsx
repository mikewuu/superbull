import { Button, ConfirmDialog, MenuItem, Popover } from '@superbull/ui';
import {
  ArrowUpCircle,
  Droplets,
  Eraser,
  Flame,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useCleanQueue } from '../../../hooks/use-clean-queue';
import { useDrainQueue } from '../../../hooks/use-drain-queue';
import { useEmptyQueue } from '../../../hooks/use-empty-queue';
import { usePauseQueue } from '../../../hooks/use-pause-queue';
import { usePromoteQueueJobs } from '../../../hooks/use-promote-queue-jobs';
import { useResumeQueue } from '../../../hooks/use-resume-queue';
import { useRetryQueueJobs } from '../../../hooks/use-retry-queue-jobs';
import type { AppQueue } from '../../../lib/api-types';
import { AddJobDialog } from './add-job-dialog';
import { ObliterateConfirmDialog } from './obliterate-confirm-dialog';

type PendingConfirm = 'empty' | 'clean-completed' | 'clean-failed' | 'drain' | null;

interface QueueActionsProps {
  queue: AppQueue;
}

export function QueueActions(props: QueueActionsProps) {
  const { queue } = props;
  const [showingMenu, setShowingMenu] = useState(false);
  const [showingAddJob, setShowingAddJob] = useState(false);
  const [showingObliterate, setShowingObliterate] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  const pauseQueue = usePauseQueue();
  const resumeQueue = useResumeQueue();
  const emptyQueue = useEmptyQueue();
  const cleanQueue = useCleanQueue();
  const retryQueueJobs = useRetryQueueJobs();
  const promoteQueueJobs = usePromoteQueueJobs();
  const drainQueue = useDrainQueue();

  const closeMenuAnd = (action: () => void) => {
    setShowingMenu(false);
    action();
  };

  return (
    <div className="flex items-center gap-2">
      {queue.is_paused ? (
        <Button
          variant="secondary"
          className="h-9 text-xs"
          icon={<Play className="size-3.5" />}
          text="Resume"
          loading={resumeQueue.isPending}
          onClick={() => resumeQueue.mutate(queue.name)}
        />
      ) : (
        <Button
          variant="secondary"
          className="h-9 text-xs"
          icon={<Pause className="size-3.5" />}
          text="Pause"
          loading={pauseQueue.isPending}
          onClick={() => pauseQueue.mutate(queue.name)}
        />
      )}

      <Button
        className="h-9 text-xs"
        icon={<Plus className="size-3.5" />}
        text="Add job"
        onClick={() => setShowingAddJob(true)}
      />

      <Popover
        showing={showingMenu}
        onShowingChange={setShowingMenu}
        align="end"
        trigger={
          <button
            type="button"
            aria-label="Queue actions"
            className="flex size-9 items-center justify-center rounded-lg border border-border-subtle text-content-default hover:bg-bg-muted"
          >
            <MoreHorizontal className="size-4" />
          </button>
        }
      >
        <div className="flex min-w-52 flex-col">
          {queue.allow_retries && (
            <MenuItem
              icon={RotateCcw}
              label="Retry all failed"
              disabled={(queue.counts.failed ?? 0) === 0}
              onClick={() =>
                closeMenuAnd(() =>
                  retryQueueJobs.mutate({ queueName: queue.name, status: 'failed' }),
                )
              }
            />
          )}
          <MenuItem
            icon={ArrowUpCircle}
            label="Promote all delayed"
            disabled={(queue.counts.delayed ?? 0) === 0}
            onClick={() => closeMenuAnd(() => promoteQueueJobs.mutate(queue.name))}
          />
          <MenuItem
            icon={Eraser}
            label="Clean completed…"
            onClick={() => closeMenuAnd(() => setPendingConfirm('clean-completed'))}
          />
          <MenuItem
            icon={Eraser}
            label="Clean failed…"
            onClick={() => closeMenuAnd(() => setPendingConfirm('clean-failed'))}
          />
          <MenuItem
            icon={Trash2}
            label="Empty queue…"
            danger
            onClick={() => closeMenuAnd(() => setPendingConfirm('empty'))}
          />
          <MenuItem
            icon={Droplets}
            label="Drain queue…"
            danger
            onClick={() => closeMenuAnd(() => setPendingConfirm('drain'))}
          />
          <MenuItem
            icon={Flame}
            label="Obliterate queue…"
            danger
            onClick={() => closeMenuAnd(() => setShowingObliterate(true))}
          />
        </div>
      </Popover>

      <AddJobDialog
        queueName={queue.name}
        showing={showingAddJob}
        onClose={() => setShowingAddJob(false)}
      />

      <ConfirmDialog
        showing={pendingConfirm === 'empty'}
        onClose={() => setPendingConfirm(null)}
        title="Empty queue"
        description={`Remove every waiting and delayed job from "${queue.name}". Active jobs keep running. This cannot be undone.`}
        confirmText="Empty queue"
        loading={emptyQueue.isPending}
        onConfirm={() =>
          emptyQueue.mutate(queue.name, { onSuccess: () => setPendingConfirm(null) })
        }
      />
      <ConfirmDialog
        showing={pendingConfirm === 'clean-completed'}
        onClose={() => setPendingConfirm(null)}
        title="Clean completed jobs"
        description={`Delete all completed jobs from "${queue.name}". This cannot be undone.`}
        confirmText="Clean completed"
        loading={cleanQueue.isPending}
        onConfirm={() =>
          cleanQueue.mutate(
            { queueName: queue.name, status: 'completed' },
            { onSuccess: () => setPendingConfirm(null) },
          )
        }
      />
      <ConfirmDialog
        showing={pendingConfirm === 'clean-failed'}
        onClose={() => setPendingConfirm(null)}
        title="Clean failed jobs"
        description={`Delete all failed jobs from "${queue.name}". This cannot be undone.`}
        confirmText="Clean failed"
        loading={cleanQueue.isPending}
        onConfirm={() =>
          cleanQueue.mutate(
            { queueName: queue.name, status: 'failed' },
            { onSuccess: () => setPendingConfirm(null) },
          )
        }
      />
      <ConfirmDialog
        showing={pendingConfirm === 'drain'}
        onClose={() => setPendingConfirm(null)}
        title="Drain queue"
        description={`Remove every waiting job from "${queue.name}". Delayed, active, completed and failed jobs are kept. This cannot be undone.`}
        confirmText="Drain queue"
        loading={drainQueue.isPending}
        onConfirm={() =>
          drainQueue.mutate(queue.name, { onSuccess: () => setPendingConfirm(null) })
        }
      />
      <ObliterateConfirmDialog
        queueName={queue.name}
        showing={showingObliterate}
        onClose={() => setShowingObliterate(false)}
      />
    </div>
  );
}
