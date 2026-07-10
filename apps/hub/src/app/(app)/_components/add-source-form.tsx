'use client';

import { Button } from '@bullwatch/ui';
import { useActionState } from 'react';
import { createSourceAction } from '../actions';

const initialState = { error: null };

export function AddSourceForm() {
  const [state, formAction, pending] = useActionState(createSourceAction, initialState);

  return (
    <div className="candy-card rounded-lg p-4">
      <h2 className="text-sm font-medium text-content-emphasis">Add source</h2>
      <form action={formAction} className="mt-3 space-y-3">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-content-subtle">
            Name
          </label>
          <input
            id="name"
            name="name"
            data-testid="add-source-name"
            required
            className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          />
        </div>
        <div>
          <label htmlFor="url" className="block text-xs font-medium text-content-subtle">
            URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            placeholder="https://proxy.example.com"
            data-testid="add-source-url"
            required
            className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 font-mono text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          />
        </div>
        <div>
          <label htmlFor="token" className="block text-xs font-medium text-content-subtle">
            Token
          </label>
          <input
            id="token"
            name="token"
            type="password"
            data-testid="add-source-token"
            required
            className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          />
          <p className="mt-1 text-xs text-content-muted">
            The token this proxy was started with (its startProxy token).
          </p>
        </div>
        {state.error && <p className="text-xs text-content-error">{state.error}</p>}
        <Button
          type="submit"
          data-testid="add-source-submit"
          text="Add source"
          loading={pending}
          className="w-full"
        />
      </form>
    </div>
  );
}
