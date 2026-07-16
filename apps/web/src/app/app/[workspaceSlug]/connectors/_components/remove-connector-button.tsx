'use client';

import { ConfirmDialog } from '@superbull/ui';
import { useState, useTransition } from 'react';
import { removeConnectorAction } from '../actions';

interface RemoveConnectorButtonProps {
  workspaceSlug: string;
  connectorId: string;
  connectorName: string;
}

export function RemoveConnectorButton(props: RemoveConnectorButtonProps) {
  const { workspaceSlug, connectorId, connectorName } = props;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await removeConnectorAction(workspaceSlug, connectorId);
      setConfirming(false);
    });
  };

  return (
    <>
      <button
        type="button"
        data-testid="remove-connector"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-content-muted hover:text-content-error hover:underline"
      >
        Remove
      </button>
      <ConfirmDialog
        showing={confirming}
        onClose={() => setConfirming(false)}
        title="Remove connector"
        description={`This removes "${connectorName}" and its ingested data from this workspace.`}
        confirmText="Remove"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
