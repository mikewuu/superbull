'use client';

import { Button, ConfirmDialog } from '@bullwatch/ui';
import { useState, useTransition } from 'react';
import type { ErrorGroupState } from '../../../../../lib/errors/types';
import {
  ignoreErrorGroupAction,
  reopenErrorGroupAction,
  resolveErrorGroupAction,
} from '../../actions';

interface ErrorGroupActionsProps {
  groupId: string;
  state: ErrorGroupState;
}

export function ErrorGroupActions(props: ErrorGroupActionsProps) {
  const { groupId, state } = props;
  const [confirmingIgnore, setConfirmingIgnore] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleResolve = () => {
    startTransition(async () => {
      await resolveErrorGroupAction(groupId);
    });
  };

  const handleReopen = () => {
    startTransition(async () => {
      await reopenErrorGroupAction(groupId);
    });
  };

  const handleConfirmIgnore = () => {
    startTransition(async () => {
      await ignoreErrorGroupAction(groupId);
      setConfirmingIgnore(false);
    });
  };

  if (state !== 'open') {
    return (
      <Button
        variant="secondary"
        className="h-8"
        text="Reopen"
        loading={pending}
        onClick={handleReopen}
        data-testid="reopen-error-group"
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        className="h-8"
        text="Ignore"
        loading={pending}
        onClick={() => setConfirmingIgnore(true)}
        data-testid="ignore-error-group"
      />
      <Button
        variant="primary"
        className="h-8"
        text="Resolve"
        loading={pending}
        onClick={handleResolve}
        data-testid="resolve-error-group"
      />
      <ConfirmDialog
        showing={confirmingIgnore}
        onClose={() => setConfirmingIgnore(false)}
        title="Ignore error group"
        description="This hides the group from the Open and Regressions tabs until it's reopened."
        confirmText="Ignore"
        loading={pending}
        onConfirm={handleConfirmIgnore}
      />
    </div>
  );
}
