'use client';

import { Button } from '@superbull/ui';
import { useActionState, useState } from 'react';
import { type DeleteWorkspaceActionState, deleteWorkspaceAction } from '../actions';

const initialState: DeleteWorkspaceActionState = { error: null };

interface DangerZoneProps {
  workspaceSlug: string;
  workspaceName: string;
}

export function DangerZone(props: DangerZoneProps) {
  const { workspaceSlug, workspaceName } = props;
  const [confirmText, setConfirmText] = useState('');
  const [state, formAction, pending] = useActionState(
    deleteWorkspaceAction.bind(null, workspaceSlug),
    initialState,
  );

  const matches = confirmText === workspaceName;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-content-emphasis">Delete this workspace</p>
      <p className="mt-1 text-xs text-content-subtle">
        This permanently deletes &quot;{workspaceName}&quot;, its connectors, and all ingested data.
        Type the workspace name to confirm.
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="name"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={workspaceName}
          data-testid="delete-workspace-confirm"
          className="h-9 w-64 rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
        />
        <Button
          type="submit"
          variant="secondary"
          data-testid="delete-workspace-submit"
          text="Delete workspace"
          loading={pending}
          disabled={!matches}
          className="h-9 text-content-error"
        />
      </form>
      {state.error && <p className="mt-2 text-xs text-content-error">{state.error}</p>}
    </div>
  );
}
