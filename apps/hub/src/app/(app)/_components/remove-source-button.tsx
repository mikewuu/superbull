'use client';

import { ConfirmDialog } from '@bullwatch/ui';
import { useState, useTransition } from 'react';
import { deleteSourceAction } from '../actions';

interface RemoveSourceButtonProps {
  sourceId: string;
  sourceName: string;
}

export function RemoveSourceButton(props: RemoveSourceButtonProps) {
  const { sourceId, sourceName } = props;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteSourceAction(sourceId);
      setConfirming(false);
    });
  };

  return (
    <>
      <button
        type="button"
        data-testid="remove-source"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-content-muted hover:text-content-error hover:underline"
      >
        Remove
      </button>
      <ConfirmDialog
        showing={confirming}
        onClose={() => setConfirming(false)}
        title="Remove source"
        description={`This removes "${sourceName}" from this hub. The proxy itself keeps running.`}
        confirmText="Remove"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
