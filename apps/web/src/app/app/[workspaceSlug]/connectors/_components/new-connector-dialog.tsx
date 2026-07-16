'use client';

import { Button, Dialog } from '@superbull/ui';
import { Check, Copy, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { type CreateConnectorActionState, createConnectorAction } from '../actions';

const initialState: CreateConnectorActionState = { error: null };

interface NewConnectorDialogProps {
  workspaceSlug: string;
  gatewayWsUrl: string;
}

export function NewConnectorDialog(props: NewConnectorDialogProps) {
  const { workspaceSlug, gatewayWsUrl } = props;
  const [showing, setShowing] = useState(false);

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
        {showing && (
          <NewConnectorFlow
            workspaceSlug={workspaceSlug}
            gatewayWsUrl={gatewayWsUrl}
            onDone={() => setShowing(false)}
          />
        )}
      </Dialog>
    </>
  );
}

interface NewConnectorFlowProps {
  workspaceSlug: string;
  gatewayWsUrl: string;
  onDone: () => void;
}

// Holds the form/result state. Mounted fresh on every dialog open (the
// parent renders it conditionally on `showing`), so reopening always starts
// at the name form and a one-time token is never shown twice.
function NewConnectorFlow(props: NewConnectorFlowProps) {
  const { workspaceSlug, gatewayWsUrl, onDone } = props;
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createConnectorAction.bind(null, workspaceSlug),
    initialState,
  );

  // While the token screen is up, refresh the page data every few seconds so
  // the row behind the dialog really does flip to online the moment the
  // connector dials in, like the copy below promises.
  const showingToken = state.result !== undefined;
  useEffect(() => {
    if (!showingToken) {
      return;
    }
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [showingToken, router]);

  const command = state.result
    ? `npx @superbull/connector --url ${gatewayWsUrl} --token ${state.result.token} --name "${state.result.connector.name}"`
    : null;

  if (state.result && command) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border-subtle bg-bg-warning p-3 text-xs text-content-subtle">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-content-emphasis">
              This token is shown once. Save it now.
            </p>
            <CopyButton value={state.result.token} label="Copy token" />
          </div>
          <p className="mt-1 break-all font-mono text-[11px]" data-testid="add-connector-token">
            {state.result.token}
          </p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-bg-muted p-3 text-xs text-content-subtle">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-content-emphasis">Run the connector</p>
            <CopyButton value={command} label="Copy command" />
          </div>
          <pre
            data-testid="add-connector-command"
            className="mt-2 overflow-x-auto rounded-md bg-bg-default p-2 font-mono text-[11px] text-content-default"
          >
            {command}
          </pre>
          <p className="mt-2">
            Run it next to your Redis and point it there with{' '}
            <code className="font-mono">--redis-host</code> /{' '}
            <code className="font-mono">--redis-port</code> (defaults to 127.0.0.1:6379). It appears
            as <span className="font-medium text-content-emphasis">online</span> here as soon as it
            connects.
          </p>
        </div>
        <Button
          type="button"
          text="Done"
          data-testid="add-connector-done"
          className="w-full"
          onClick={onDone}
        />
      </div>
    );
  }

  return (
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
          placeholder="e.g. billing-workers"
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
  );
}

function CopyButton(props: { value: string; label: string }) {
  const { value, label } = props;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : label}
      title={label}
      className="shrink-0 rounded-md p-1 text-content-subtle transition-colors hover:bg-bg-default hover:text-content-emphasis"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => setCopied(true));
      }}
    >
      {copied ? <Check className="size-3.5 text-content-success" /> : <Copy className="size-3.5" />}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}
