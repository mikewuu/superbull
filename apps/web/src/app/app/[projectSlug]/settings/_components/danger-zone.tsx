'use client';

import { Button } from '@superbull/ui';
import { useActionState, useState } from 'react';
import { type DeleteProjectActionState, deleteProjectAction } from '../actions';

const initialState: DeleteProjectActionState = { error: null };

interface DangerZoneProps {
  projectSlug: string;
  projectName: string;
}

export function DangerZone(props: DangerZoneProps) {
  const { projectSlug, projectName } = props;
  const [confirmText, setConfirmText] = useState('');
  const [state, formAction, pending] = useActionState(
    deleteProjectAction.bind(null, projectSlug),
    initialState,
  );

  const matches = confirmText === projectName;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-content-emphasis">Delete this project</p>
      <p className="mt-1 text-xs text-content-subtle">
        This permanently deletes &quot;{projectName}&quot;, its connectors, and all ingested data.
        Type the project name to confirm.
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="name"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={projectName}
          data-testid="delete-project-confirm"
          className="h-9 w-64 rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
        />
        <Button
          type="submit"
          variant="secondary"
          data-testid="delete-project-submit"
          text="Delete project"
          loading={pending}
          disabled={!matches}
          className="h-9 text-content-error"
        />
      </form>
      {state.error && <p className="mt-2 text-xs text-content-error">{state.error}</p>}
    </div>
  );
}
