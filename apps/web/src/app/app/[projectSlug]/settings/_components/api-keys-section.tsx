'use client';

import { Button } from '@superbull/ui';
import { useActionState, useState, useTransition } from 'react';
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

  const handleRevoke = (apiKeyId: Id<'apiKeys'>) => {
    startRevoke(async () => {
      const result = await revokeApiKey({ projectSlug, apiKeyId });
      if (!result.wasSuccessful) {
        setRevokeError(result.error);
        return;
      }
      setRevokeError(null);
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
          <div className="mt-3 rounded-lg border border-border-subtle bg-bg-muted p-3">
            <p className="text-xs font-medium text-content-emphasis">Copy this key now</p>
            <p className="mt-1 text-xs text-content-subtle">It will not be shown again.</p>
            <code className="mt-2 block break-all font-mono text-xs text-content-default">
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
                    onClick={() => handleRevoke(apiKey._id)}
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
    </section>
  );
}
