'use client';

import { Button } from '@superbull/ui';
import { useActionState } from 'react';
import { createWorkspaceAction } from '../actions';

const initialState = { error: null };

export function NewWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspaceAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-content-subtle">
          Workspace name
        </label>
        <input
          id="name"
          name="name"
          data-testid="new-workspace-name"
          required
          className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
        />
      </div>
      {state.error && <p className="text-xs text-content-error">{state.error}</p>}
      <Button
        type="submit"
        data-testid="new-workspace-submit"
        text="Create workspace"
        loading={pending}
        className="w-full"
      />
    </form>
  );
}
