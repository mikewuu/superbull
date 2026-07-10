'use client';

import { Button, Dialog } from '@bullwatch/ui';
import { Plus } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { createSourceAction } from '../actions';

const initialState = { error: null };

export function AddSourceForm() {
  const [showing, setShowing] = useState(false);
  const [state, formAction, pending] = useActionState(createSourceAction, initialState);

  useEffect(() => {
    if (state.ok && !pending) {
      setShowing(false);
    }
  }, [state.ok, pending]);

  return (
    <>
      <Button
        data-testid="add-source-open"
        icon={<Plus className="size-3.5" />}
        text="Add source"
        className="h-8 text-xs"
        onClick={() => setShowing(true)}
      />
      <Dialog showing={showing} onClose={() => setShowing(false)} title="Add source">
        <div className="rounded-lg border border-border-subtle bg-bg-muted p-3 text-xs text-content-subtle">
          <p className="font-medium text-content-emphasis">Connect a proxy</p>
          <p className="mt-1">Run the connector next to your workers, then register it here:</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-bg-default p-2 font-mono text-[11px] text-content-default">
            npx @bullwatch/proxy -n "My app" -t &lt;token&gt; --queues a,b
          </pre>
          <p className="mt-1">
            Or pass <span className="font-mono">--hub &lt;this hub url&gt; --hub-token</span> and it
            registers itself.
          </p>
        </div>
        <form action={formAction} className="mt-4 space-y-3">
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
      </Dialog>
    </>
  );
}
