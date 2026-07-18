'use client';

import { Button } from '@superbull/ui';
import { useActionState } from 'react';
import { type InviteMemberActionState, inviteMemberAction } from '../actions';

const initialState: InviteMemberActionState = { error: null };

interface InviteFormProps {
  projectSlug: string;
}

export function InviteForm(props: InviteFormProps) {
  const { projectSlug } = props;
  const [state, formAction, pending] = useActionState(
    inviteMemberAction.bind(null, projectSlug),
    initialState,
  );

  return (
    <div className="candy-card rounded-lg p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="email" className="block text-xs font-medium text-content-subtle">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            data-testid="invite-email"
            className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-xs font-medium text-content-subtle">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            data-testid="invite-role"
            className="mt-1 h-9 rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <Button
          type="submit"
          data-testid="invite-submit"
          text="Send invite"
          loading={pending}
          className="h-9"
        />
      </form>
      {state.error && <p className="mt-2 text-xs text-content-error">{state.error}</p>}
      {state.acceptUrl && (
        <div
          data-testid="invite-accept-url"
          className="mt-3 rounded-lg border border-border-subtle bg-bg-muted p-3 text-xs text-content-subtle"
        >
          <p className="font-medium text-content-emphasis">Invite link (shown once)</p>
          <p className="mt-1 break-all font-mono text-[11px] text-content-default">
            {state.acceptUrl}
          </p>
        </div>
      )}
    </div>
  );
}
