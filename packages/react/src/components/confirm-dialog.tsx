import type { ReactNode } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';

interface ConfirmDialogProps {
  showing: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmText: string;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const { showing, onClose, title, description, confirmText, loading, onConfirm } = props;

  return (
    <Dialog showing={showing} onClose={onClose} title={title}>
      <p className="text-sm text-content-subtle">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" className="h-9" text="Cancel" onClick={onClose} />
        <Button
          variant="danger"
          className="h-9"
          text={confirmText}
          loading={loading}
          onClick={onConfirm}
        />
      </div>
    </Dialog>
  );
}
