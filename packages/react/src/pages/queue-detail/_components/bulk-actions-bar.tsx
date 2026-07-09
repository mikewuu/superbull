import { ArrowUpCircle, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../../../components/button';
import { useBulkJobAction } from '../../../hooks/use-bulk-job-action';

interface BulkActionsBarProps {
  queueName: string;
  selectedIds: string[];
  onDone: () => void;
}

export function BulkActionsBar(props: BulkActionsBarProps) {
  const { queueName, selectedIds, onDone } = props;
  const bulkAction = useBulkJobAction();

  const run = (action: 'retry' | 'promote' | 'remove') => {
    bulkAction.mutate({ queueName, action, jobIds: selectedIds }, { onSuccess: onDone });
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-bg-muted px-4 py-3">
      <span className="text-sm font-medium text-content-emphasis">
        {selectedIds.length} selected
      </span>
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
          onClick={() => run('remove')}
        />
      </div>
    </div>
  );
}
