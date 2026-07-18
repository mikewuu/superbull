'use client';

import { Button } from '@superbull/ui';
import { useActionState, useState } from 'react';
import type { StatusPageConfig } from '../../../../../lib/status-pages/types';
import { type SaveStatusPageConfigActionState, saveStatusPageConfigAction } from '../actions';

const initialState: SaveStatusPageConfigActionState = { error: null };

const slugPattern = /^[a-z0-9-]{3,50}$/;

interface StatusPageConfigFormProps {
  projectSlug: string;
  connectorId: string;
  config: StatusPageConfig | null;
}

export function StatusPageConfigForm(props: StatusPageConfigFormProps) {
  const { projectSlug, connectorId, config } = props;
  const [state, formAction, pending] = useActionState(
    saveStatusPageConfigAction.bind(null, projectSlug),
    initialState,
  );
  const [slug, setSlug] = useState(config?.slug ?? '');

  const slugInvalid = slug.length > 0 && !slugPattern.test(slug);

  return (
    <div className="candy-card rounded-lg p-4">
      <h2 className="text-sm font-medium text-content-emphasis">Page settings</h2>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="connectorId" value={connectorId} />
        <div className="flex items-center gap-2">
          <input
            id="isEnabled"
            name="isEnabled"
            type="checkbox"
            defaultChecked={config?.isEnabled ?? false}
            className="size-4 rounded border-border-subtle"
          />
          <label htmlFor="isEnabled" className="text-xs font-medium text-content-subtle">
            Enabled
          </label>
        </div>
        <div>
          <label htmlFor="title" className="block text-xs font-medium text-content-subtle">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={config?.title ?? ''}
            required
            className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block text-xs font-medium text-content-subtle">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 font-mono text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          />
          {slugInvalid && (
            <p className="mt-1 text-xs text-content-error">
              Lowercase letters, digits, and hyphens only, 3-50 characters.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="queueNames" className="block text-xs font-medium text-content-subtle">
            Queue names (comma-separated, leave blank to monitor all queues)
          </label>
          <input
            id="queueNames"
            name="queueNames"
            defaultValue={config?.queueNames.join(', ') ?? ''}
            className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 font-mono text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          />
        </div>
        {state.error && <p className="text-xs text-content-error">{state.error}</p>}
        <Button type="submit" text="Save" loading={pending} className="w-full" />
      </form>
    </div>
  );
}
