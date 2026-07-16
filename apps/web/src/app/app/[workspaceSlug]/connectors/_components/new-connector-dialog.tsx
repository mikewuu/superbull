'use client';

import { Button, Dialog } from '@superbull/ui';
import { Plus } from 'lucide-react';
import { useActionState, useState } from 'react';
import { type CreateConnectorActionState, createConnectorAction } from '../actions';

const initialState: CreateConnectorActionState = { error: null };

interface NewConnectorDialogProps {
  workspaceSlug: string;
}

export function NewConnectorDialog(props: NewConnectorDialogProps) {
  const { workspaceSlug } = props;
  const [showing, setShowing] = useState(false);
  const [state, formAction, pending] = useActionState(
    createConnectorAction.bind(null, workspaceSlug),
    initialState,
  );

  const command = state.result
    ? `npx @superbull/connector --url wss://connect.superbull.com --token ${state.result.token} --name "${state.result.connector.name}"`
    : null;

  return (
    <>
      <Button
        data-testid="add-connector-open"
        icon={<Plus className="size-3.5" />}
        text="New connector"
        className="h-8 text-xs"
        onClick={() => setShowing(true)}
      />
      <Dialog showing={showing} onClose={() => setShowing(false)} title="New connector">
        {state.result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-content-subtle">
              <p className="font-medium text-content-emphasis">
                This token is shown once. Save it now.
              </p>
              <p className="mt-1 break-all font-mono text-[11px]" data-testid="add-connector-token">
                {state.result.token}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-muted p-3 text-xs text-content-subtle">
              <p className="font-medium text-content-emphasis">Run the connector</p>
              <pre
                data-testid="add-connector-command"
                className="mt-2 overflow-x-auto rounded-md bg-bg-default p-2 font-mono text-[11px] text-content-default"
              >
                {command}
              </pre>
            </div>
            <Button
              type="button"
              text="Done"
              data-testid="add-connector-done"
              className="w-full"
              onClick={() => setShowing(false)}
            />
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-content-subtle">
                Name
              </label>
              <input
                id="name"
                name="name"
                data-testid="add-connector-name"
                required
                className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
              />
            </div>
            {state.error && <p className="text-xs text-content-error">{state.error}</p>}
            <Button
              type="submit"
              data-testid="add-connector-submit"
              text="Create connector"
              loading={pending}
              className="w-full"
            />
          </form>
        )}
      </Dialog>
    </>
  );
}
