'use client';

import { useTransition } from 'react';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { revokeInviteAction } from '../actions';

interface Invite {
  _id: Id<'invites'>;
  email: string;
  role: 'owner' | 'admin' | 'member';
  expiresAt: number;
  acceptedAt?: number;
}

interface InvitesTableProps {
  workspaceSlug: string;
  invites: Invite[];
}

export function InvitesTable(props: InvitesTableProps) {
  const { workspaceSlug, invites } = props;
  const pending = invites.filter((invite) => !invite.acceptedAt && invite.expiresAt > Date.now());

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Email</th>
            <th className="w-24 px-4 py-2.5 font-medium">Role</th>
            <th className="w-20 px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {pending.map((invite) => (
            <tr
              key={invite._id}
              data-testid="invite-row"
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3 font-medium text-content-emphasis">{invite.email}</td>
              <td className="px-4 py-3 text-content-subtle">{invite.role}</td>
              <td className="px-5 py-3 text-right">
                <RevokeInviteButton workspaceSlug={workspaceSlug} inviteId={invite._id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevokeInviteButton(props: { workspaceSlug: string; inviteId: Id<'invites'> }) {
  const { workspaceSlug, inviteId } = props;
  const [pending, startTransition] = useTransition();

  const handleRevoke = () => {
    startTransition(async () => {
      await revokeInviteAction(workspaceSlug, inviteId);
    });
  };

  return (
    <button
      type="button"
      data-testid="revoke-invite"
      disabled={pending}
      onClick={handleRevoke}
      className="text-xs font-medium text-content-muted hover:text-content-error hover:underline disabled:opacity-60"
    >
      Revoke
    </button>
  );
}
