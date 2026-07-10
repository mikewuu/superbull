'use client';

import { Button, Dialog } from '@bullwatch/ui';
import { useActionState, useEffect, useState } from 'react';
import type { AlertRuleType } from '../../../../lib/alerts/types';
import { createAlertRuleAction } from '../actions';

const initialState = { error: null };

interface NewRuleDialogProps {
  sources: Array<{ id: string; name: string }>;
}

export function NewRuleDialog(props: NewRuleDialogProps) {
  const { sources } = props;
  const [showing, setShowing] = useState(false);
  const [type, setType] = useState<AlertRuleType>('failed_threshold');
  const [state, formAction, pending] = useActionState(createAlertRuleAction, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error) {
      setShowing(false);
    }
  }, [state]);

  return (
    <>
      <Button text="New rule" data-testid="new-rule-trigger" onClick={() => setShowing(true)} />
      <Dialog showing={showing} onClose={() => setShowing(false)} title="New alert rule">
        <form action={formAction} className="space-y-3">
          <div>
            <label htmlFor="type" className="block text-xs font-medium text-content-subtle">
              Type
            </label>
            <select
              id="type"
              name="type"
              data-testid="new-rule-type"
              value={type}
              onChange={(event) => setType(event.target.value as AlertRuleType)}
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            >
              <option value="failed_threshold">Failed threshold</option>
              <option value="stuck_queue">Stuck queue</option>
              <option value="worker_loss">Worker loss</option>
              <option value="new_error_group">New error group</option>
            </select>
          </div>
          <div>
            <label htmlFor="sourceId" className="block text-xs font-medium text-content-subtle">
              Source
            </label>
            <select
              id="sourceId"
              name="sourceId"
              defaultValue=""
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            >
              <option value="">All sources</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </div>
          {type !== 'new_error_group' && (
            <div>
              <label htmlFor="queueName" className="block text-xs font-medium text-content-subtle">
                Queue name{type === 'failed_threshold' ? ' (optional)' : ''}
              </label>
              <input
                id="queueName"
                name="queueName"
                data-testid="new-rule-queue-name"
                required={type === 'stuck_queue' || type === 'worker_loss'}
                className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 font-mono text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
              />
            </div>
          )}
          {type === 'failed_threshold' && (
            <div>
              <label htmlFor="threshold" className="block text-xs font-medium text-content-subtle">
                Threshold
              </label>
              <input
                id="threshold"
                name="threshold"
                type="number"
                min="1"
                required
                data-testid="new-rule-threshold"
                className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="windowMinutes"
              className="block text-xs font-medium text-content-subtle"
            >
              Window (minutes)
            </label>
            <input
              id="windowMinutes"
              name="windowMinutes"
              type="number"
              min="1"
              required
              defaultValue={5}
              data-testid="new-rule-window-minutes"
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-content-subtle">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              data-testid="new-rule-email"
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            />
          </div>
          {state.error && <p className="text-xs text-content-error">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              text="Cancel"
              onClick={() => setShowing(false)}
            />
            <Button
              type="submit"
              className="h-9"
              text="Create rule"
              loading={pending}
              data-testid="new-rule-submit"
            />
          </div>
        </form>
      </Dialog>
    </>
  );
}
