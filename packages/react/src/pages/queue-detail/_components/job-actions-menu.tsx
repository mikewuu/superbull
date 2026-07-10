import { ConfirmDialog, MenuItem, Popover } from '@bullwatch/ui';
import { ArrowUpCircle, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { usePromoteJob } from '../../../hooks/use-promote-job';
import { useRemoveJob } from '../../../hooks/use-remove-job';
import { useRetryJob } from '../../../hooks/use-retry-job';
import type { JobStatus } from '../../../lib/api-types';

interface JobActionsMenuProps {
  queueName: string;
  jobId: string;
  status: JobStatus;
  allowRetries: boolean;
  allowCompletedRetries: boolean;
}

export function JobActionsMenu(props: JobActionsMenuProps) {
  const { queueName, jobId, status, allowRetries, allowCompletedRetries } = props;
  const showingRetry = status === 'completed' ? allowCompletedRetries : allowRetries;
  const [showingMenu, setShowingMenu] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const retryJob = useRetryJob();
  const promoteJob = usePromoteJob();
  const removeJob = useRemoveJob();

  const closeMenuAnd = (action: () => void) => {
    setShowingMenu(false);
    action();
  };

  return (
    <>
      <Popover
        showing={showingMenu}
        onShowingChange={setShowingMenu}
        align="end"
        trigger={
          <button
            type="button"
            aria-label="Job actions"
            className="flex size-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-default text-content-default hover:bg-bg-muted"
          >
            <MoreHorizontal className="size-4" />
          </button>
        }
      >
        <div className="flex min-w-40 flex-col">
          {showingRetry && (
            <MenuItem
              icon={RotateCcw}
              label="Retry"
              onClick={() => closeMenuAnd(() => retryJob.mutate({ queueName, jobId }))}
            />
          )}
          {status === 'delayed' && (
            <MenuItem
              icon={ArrowUpCircle}
              label="Promote"
              onClick={() => closeMenuAnd(() => promoteJob.mutate({ queueName, jobId }))}
            />
          )}
          <MenuItem
            icon={Trash2}
            label="Remove…"
            danger
            onClick={() => closeMenuAnd(() => setConfirmingRemove(true))}
          />
        </div>
      </Popover>

      <ConfirmDialog
        showing={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        title="Remove job"
        description={`Delete job #${jobId} from "${queueName}". This cannot be undone.`}
        confirmText="Remove job"
        loading={removeJob.isPending}
        onConfirm={() =>
          removeJob.mutate({ queueName, jobId }, { onSuccess: () => setConfirmingRemove(false) })
        }
      />
    </>
  );
}
