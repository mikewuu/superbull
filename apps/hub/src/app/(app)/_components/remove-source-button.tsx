'use client';

import { useState, useTransition } from 'react';
import { deleteSourceAction } from '../actions';

interface RemoveSourceButtonProps {
  sourceId: string;
}

export function RemoveSourceButton(props: RemoveSourceButtonProps) {
  const { sourceId } = props;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await deleteSourceAction(sourceId);
    });
  };

  return (
    <button
      type="button"
      data-testid="remove-source"
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={pending}
      className={`text-xs font-medium hover:underline disabled:opacity-50 ${
        confirming ? 'text-red-600' : 'text-neutral-500'
      }`}
    >
      {pending ? 'Removing…' : confirming ? 'Confirm?' : 'Remove'}
    </button>
  );
}
