'use client';

import { useActionState } from 'react';
import { createSourceAction } from '../actions';

const initialState = { error: null };

export function AddSourceForm() {
  const [state, formAction, pending] = useActionState(createSourceAction, initialState);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-medium text-neutral-900">Add source</h2>
      <form action={formAction} className="mt-3 space-y-3">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-neutral-500">
            Name
          </label>
          <input
            id="name"
            name="name"
            data-testid="add-source-name"
            required
            className="mt-1 w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-600"
          />
        </div>
        <div>
          <label htmlFor="url" className="block text-xs font-medium text-neutral-500">
            URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            placeholder="https://proxy.example.com"
            data-testid="add-source-url"
            required
            className="mt-1 w-full rounded-md border border-neutral-200 px-2.5 py-1.5 font-mono text-sm text-neutral-900 outline-none focus:border-blue-600"
          />
        </div>
        <div>
          <label htmlFor="token" className="block text-xs font-medium text-neutral-500">
            Token
          </label>
          <input
            id="token"
            name="token"
            type="password"
            data-testid="add-source-token"
            required
            className="mt-1 w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-600"
          />
          <p className="mt-1 text-xs text-neutral-500">
            The token this proxy was started with (its startProxy token).
          </p>
        </div>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button
          type="submit"
          data-testid="add-source-submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add source'}
        </button>
      </form>
    </div>
  );
}
