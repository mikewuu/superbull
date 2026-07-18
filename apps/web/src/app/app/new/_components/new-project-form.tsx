'use client';

import { Button } from '@superbull/ui';
import { useActionState } from 'react';
import { createProjectAction } from '../actions';

const initialState = { error: null };

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-content-subtle">
          Project name
        </label>
        <input
          id="name"
          name="name"
          data-testid="new-project-name"
          required
          className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
        />
      </div>
      {state.error && <p className="text-xs text-content-error">{state.error}</p>}
      <Button
        type="submit"
        data-testid="new-project-submit"
        text="Create project"
        loading={pending}
        className="w-full"
      />
    </form>
  );
}
