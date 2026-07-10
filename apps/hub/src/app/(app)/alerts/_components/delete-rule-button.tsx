'use client';

import { ConfirmDialog } from '@bullwatch/ui';
import { useState, useTransition } from 'react';
import { deleteAlertRuleAction } from '../actions';

interface DeleteRuleButtonProps {
  ruleId: string;
  ruleLabel: string;
}

export function DeleteRuleButton(props: DeleteRuleButtonProps) {
  const { ruleId, ruleLabel } = props;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteAlertRuleAction(ruleId);
      setConfirming(false);
    });
  };

  return (
    <>
      <button
        type="button"
        data-testid="delete-alert-rule"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-content-muted hover:text-content-error hover:underline"
      >
        Remove
      </button>
      <ConfirmDialog
        showing={confirming}
        onClose={() => setConfirming(false)}
        title="Remove alert rule"
        description={`This removes the "${ruleLabel}" rule. It will stop firing and stop sending emails.`}
        confirmText="Remove"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
