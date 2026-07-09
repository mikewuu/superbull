import { ArrowUpCircle, type LucideIcon, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Popover } from '../../../components/popover';
import { usePromoteJob } from '../../../hooks/use-promote-job';
import { useRemoveJob } from '../../../hooks/use-remove-job';
import { useRetryJob } from '../../../hooks/use-retry-job';
import type { JobStatus } from '../../../lib/api-types';
import { cn } from '../../../lib/cn';

interface JobActionsMenuProps {
  queueName: string;
  jobId: string;
  status: JobStatus;
}

export function JobActionsMenu(props: JobActionsMenuProps) {
  const { queueName, jobId, status } = props;
  const [showing, setShowing] = useState(false);
  const retryJob = useRetryJob();
  const promoteJob = usePromoteJob();
  const removeJob = useRemoveJob();

  const run = (mutate: () => void) => {
    mutate();
    setShowing(false);
  };

  return (
    <Popover
      showing={showing}
      onShowingChange={setShowing}
      align="end"
      trigger={
        <button
          type="button"
          aria-label="Job actions"
          className="flex size-8 items-center justify-center rounded-lg border border-border-subtle text-content-default hover:bg-bg-muted"
        >
          <MoreHorizontal className="size-4" />
        </button>
      }
    >
      <div className="flex min-w-40 flex-col">
        <MenuItem
          icon={RotateCcw}
          label="Retry"
          onClick={() => run(() => retryJob.mutate({ queueName, jobId }))}
        />
        {status === 'delayed' && (
          <MenuItem
            icon={ArrowUpCircle}
            label="Promote"
            onClick={() => run(() => promoteJob.mutate({ queueName, jobId }))}
          />
        )}
        <MenuItem
          icon={Trash2}
          label="Remove"
          danger
          onClick={() => run(() => removeJob.mutate({ queueName, jobId }))}
        />
      </div>
    </Popover>
  );
}

function MenuItem(props: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const { icon: Icon, label, danger, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-content-default hover:bg-bg-muted',
        { 'text-content-error hover:bg-bg-error': danger },
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  );
}
