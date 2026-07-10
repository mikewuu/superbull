import { ArrowUpCircle, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/button';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { useBulkJobAction } from '../../../hooks/use-bulk-job-action';

interface BulkActionsBarProps {
  queueName: string;
  selectedIds: string[];
  onDone: () => void;
}

export function BulkActionsBar(props: BulkActionsBarProps) {
  const { queueName, selectedIds, onDone } = props;
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const bulkAction = useBulkJobAction();

  const run = (action: 'retry' | 'promote' | 'remove') => {
    bulkAction.mutate({ queueName, action, jobIds: selectedIds }, { onSuccess: onDone });
  };

  return (
    <div
      data-testid="bulk-bar"
      className="flex animate-fade-in items-center justify-between gap-4 rounded-lg border border-border-default bg-bg-default px-4 py-2.5 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onDone}
          className="rounded-md p-1 text-content-muted hover:bg-bg-muted hover:text-content-emphasis"
        >
          <X className="size-4" />
        </button>
        <span className="text-sm font-medium text-content-emphasis">
          {selectedIds.length} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          icon={<RotateCcw className="size-3.5" />}
          text="Retry"
          loading={bulkAction.isPending}
          onClick={() => run('retry')}
        />
        <Button
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          icon={<ArrowUpCircle className="size-3.5" />}
          text="Promote"
          loading={bulkAction.isPending}
          onClick={() => run('promote')}
        />
        <Button
          variant="danger-outline"
          className="h-8 px-2.5 text-xs"
          icon={<Trash2 className="size-3.5" />}
          text="Remove"
          loading={bulkAction.isPending}
          onClick={() => setConfirmingRemove(true)}
        />
      </div>

      <ConfirmDialog
        showing={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        title="Remove jobs"
        description={`Delete ${selectedIds.length} selected job${selectedIds.length === 1 ? '' : 's'} from "${queueName}". This cannot be undone.`}
        confirmText={`Remove ${selectedIds.length}`}
        loading={bulkAction.isPending}
        onConfirm={() => {
          setConfirmingRemove(false);
          run('remove');
        }}
      />
    </div>
  );
}
