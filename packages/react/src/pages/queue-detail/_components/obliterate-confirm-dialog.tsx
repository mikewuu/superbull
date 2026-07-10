import { Button, Dialog } from '@bullwatch/ui';
import { useState } from 'react';
import { useObliterateQueue } from '../../../hooks/use-obliterate-queue';

interface ObliterateConfirmDialogProps {
  queueName: string;
  showing: boolean;
  onClose: () => void;
}

export function ObliterateConfirmDialog(props: ObliterateConfirmDialogProps) {
  const { queueName, showing, onClose } = props;
  const [typedName, setTypedName] = useState('');
  const obliterateQueue = useObliterateQueue();
  const confirmed = typedName === queueName;

  const close = () => {
    setTypedName('');
    onClose();
  };

  return (
    <Dialog showing={showing} onClose={close} title="Obliterate queue">
      <p className="text-sm text-content-subtle">
        Permanently delete every job and all queue data for "{queueName}", including completed and
        failed history. This cannot be undone.
      </p>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-content-subtle">
          Type <span className="font-mono text-content-emphasis">{queueName}</span> to confirm
        </span>
        <input
          type="text"
          value={typedName}
          aria-label="Queue name confirmation"
          onChange={(event) => setTypedName(event.target.value)}
          className="h-9 rounded-lg border-border-subtle text-sm text-content-emphasis focus:border-border-emphasis focus:ring-0"
        />
      </label>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" className="h-9" text="Cancel" onClick={close} />
        <Button
          variant="danger"
          className="h-9"
          text="Obliterate queue"
          disabled={!confirmed}
          loading={obliterateQueue.isPending}
          onClick={() => obliterateQueue.mutate(queueName, { onSuccess: close })}
        />
      </div>
    </Dialog>
  );
}
