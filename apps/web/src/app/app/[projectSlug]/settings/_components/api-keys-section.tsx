'use client';

import { Button, ConfirmDialog } from '@superbull/ui';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { useActionState, useEffect, useState, useTransition } from 'react';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { type CreateApiKeyActionState, createApiKeyAction } from '../_actions/create-api-key';
import { revokeApiKey } from '../_actions/revoke-api-key';

interface ApiKey {
  _id: Id<'apiKeys'>;
  name: string;
  keyPrefix: string;
  revokedAt: number | null;
}

interface ApiKeysSectionProps {
  projectSlug: string;
  apiKeys: ApiKey[];
}

const initialState: CreateApiKeyActionState = { status: 'idle' };

export function ApiKeysSection(props: ApiKeysSectionProps) {
  const { projectSlug, apiKeys } = props;
  const [state, formAction, creating] = useActionState(createApiKeyAction, initialState);
  const [revoking, startRevoke] = useTransition();
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [confirmingApiKey, setConfirmingApiKey] = useState<ApiKey | null>(null);

  const handleRevoke = (apiKeyId: Id<'apiKeys'>) => {
    startRevoke(async () => {
      const result = await revokeApiKey({ projectSlug, apiKeyId });
      if (!result.wasSuccessful) {
        setRevokeError(result.error);
        return;
      }
      setRevokeError(null);
      setConfirmingApiKey(null);
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium text-content-emphasis">API keys</h2>
        <p className="mt-1 text-xs text-content-subtle">
          Keys work with the REST API and MCP. Each key is tied to your account.
        </p>
      </div>

      <div className="candy-card rounded-lg p-4">
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="project_slug" value={projectSlug} />
          <div className="min-w-[220px] flex-1">
            <label htmlFor="api-key-name" className="block text-xs font-medium text-content-subtle">
              Key name
            </label>
            <input
              id="api-key-name"
              name="name"
              required
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            />
          </div>
          <Button type="submit" text="Create key" loading={creating} className="h-9" />
        </form>

        {state.status === 'error' && (
          <p className="mt-2 text-xs text-content-error">{state.error}</p>
        )}
        {state.status === 'created' && (
          <div className="mt-3 rounded-lg border border-border-subtle bg-bg-warning p-3 text-xs text-content-subtle">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-content-emphasis">
                This key is shown once. Save it now.
              </p>
              <CopyButton value={state.apiKey} selectTargetId="new-api-key" />
            </div>
            <code id="new-api-key" className="mt-1 block break-all font-mono text-[11px]">
              {state.apiKey}
            </code>
          </div>
        )}
      </div>

      {apiKeys.length > 0 && (
        <div className="candy-card overflow-hidden rounded-lg">
          <ul className="divide-y divide-border-subtle">
            {apiKeys.map((apiKey) => (
              <li key={apiKey._id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-content-emphasis">{apiKey.name}</p>
                  <p className="font-mono text-xs text-content-muted">{apiKey.keyPrefix}</p>
                </div>
                {apiKey.revokedAt ? (
                  <span className="text-xs text-content-muted">Revoked</span>
                ) : (
                  <button
                    type="button"
                    disabled={revoking}
                    onClick={() => setConfirmingApiKey(apiKey)}
                    className="text-xs font-medium text-content-muted hover:text-content-error hover:underline disabled:opacity-60"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {revokeError && <p className="text-xs text-content-error">{revokeError}</p>}
      {confirmingApiKey && (
        <ConfirmDialog
          showing
          onClose={() => setConfirmingApiKey(null)}
          title="Revoke API key"
          description={`Revoke "${confirmingApiKey.name}"? Apps using this key will lose access.`}
          confirmText="Revoke"
          loading={revoking}
          onConfirm={() => handleRevoke(confirmingApiKey._id)}
        />
      )}
    </section>
  );
}

type CopyStatus = 'idle' | 'copied' | 'failed';

function CopyButton(props: { value: string; selectTargetId: string }) {
  const { value, selectTargetId } = props;
  const [status, setStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    if (status !== 'copied') {
      return;
    }
    const timer = setTimeout(() => setStatus('idle'), 1500);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <button
      type="button"
      aria-label={getCopyAriaLabel(status)}
      title="Copy key"
      className="flex shrink-0 items-center gap-1 rounded-md p-1 text-content-subtle transition-colors hover:bg-bg-default hover:text-content-emphasis"
      onClick={() => {
        const fail = () => {
          selectNodeContents(selectTargetId);
          setStatus('failed');
        };
        if (!navigator.clipboard) {
          fail();
          return;
        }
        navigator.clipboard.writeText(value).then(() => setStatus('copied'), fail);
      }}
    >
      {status === 'failed' && (
        <span className="text-[10px] font-medium text-content-error">Press Ctrl/⌘+C</span>
      )}
      {status === 'copied' && <Check className="size-3.5 text-content-success" />}
      {status === 'failed' && <TriangleAlert className="size-3.5 text-content-error" />}
      {status === 'idle' && <Copy className="size-3.5" />}
      <span aria-live="polite" className="sr-only">
        {status === 'copied' && 'Copied to clipboard'}
        {status === 'failed' &&
          'Copy failed. The text is selected; press Control C or Command C to copy it.'}
      </span>
    </button>
  );
}

function getCopyAriaLabel(status: CopyStatus): string {
  if (status === 'copied') {
    return 'Copied';
  }
  if (status === 'failed') {
    return 'Copy failed, text selected, press Control C or Command C';
  }
  return 'Copy key';
}

function selectNodeContents(id: string): void {
  const node = document.getElementById(id);
  const selection = window.getSelection();
  if (!node || !selection) {
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}
