'use client';

import { useState, useTransition } from 'react';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { removeMemberAction } from '../actions';

interface Member {
  _id: Id<'members'>;
  userId: Id<'users'>;
  role: 'owner' | 'admin' | 'member';
  email: string | null;
  name: string | null;
}

interface MembersTableProps {
  projectSlug: string;
  members: Member[];
  canManage: boolean;
  currentUserId: Id<'users'>;
}

export function MembersTable(props: MembersTableProps) {
  const { projectSlug, members, canManage, currentUserId } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Member</th>
            <th className="w-24 px-4 py-2.5 font-medium">Role</th>
            <th className="w-20 px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member._id}
              data-testid="member-row"
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3">
                <span className="font-medium text-content-emphasis">
                  {member.name ?? member.email ?? 'Unknown'}
                </span>
                {member.userId === currentUserId && (
                  <span className="ml-1.5 text-xs text-content-muted">(you)</span>
                )}
                {member.email && member.name && (
                  <span className="ml-1.5 text-xs text-content-muted">{member.email}</span>
                )}
              </td>
              <td className="px-4 py-3 text-content-subtle">{member.role}</td>
              <td className="px-5 py-3 text-right">
                {canManage && member.role !== 'owner' && (
                  <RemoveMemberButton projectSlug={projectSlug} memberId={member._id} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RemoveMemberButton(props: { projectSlug: string; memberId: Id<'members'> }) {
  const { projectSlug, memberId } = props;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeMemberAction(projectSlug, memberId);
      setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        data-testid="remove-member"
        disabled={pending}
        onClick={handleRemove}
        className="text-xs font-medium text-content-muted hover:text-content-error hover:underline disabled:opacity-60"
      >
        Remove
      </button>
      {error && <p className="text-xs text-content-error">{error}</p>}
    </div>
  );
}
