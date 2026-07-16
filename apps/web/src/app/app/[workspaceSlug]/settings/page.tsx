import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { PageHeader } from '@superbull/ui';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../convex/_generated/api';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';
import { DangerZone } from './_components/danger-zone';
import { InviteForm } from './_components/invite-form';
import { InvitesTable } from './_components/invites-table';
import { MembersTable } from './_components/members-table';

export const dynamic = 'force-dynamic';

interface SettingsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function SettingsPage(props: SettingsPageProps) {
  const { workspaceSlug } = await props.params;
  const { workspace, member } = await requireWorkspaceForSlug(workspaceSlug);
  const canManage = member.role === 'owner' || member.role === 'admin';

  const token = await convexAuthNextjsToken();
  const [members, invites] = await Promise.all([
    fetchQuery(api.workspaces.listMembers, { workspaceId: workspace._id }, { token }),
    fetchQuery(api.invites.listByWorkspace, { workspaceId: workspace._id }, { token }),
  ]);

  return (
    <>
      <PageHeader title="Settings" subtitle={workspace.name} />
      <div className="flex w-full flex-col gap-6 px-4 py-4 lg:px-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-content-emphasis">Members</h2>
          <MembersTable
            workspaceSlug={workspaceSlug}
            members={members}
            canManage={canManage}
            currentUserId={member.userId}
          />
        </section>

        {canManage && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-content-emphasis">Invite by email</h2>
            <InviteForm workspaceSlug={workspaceSlug} />
            {invites.length > 0 && <InvitesTable workspaceSlug={workspaceSlug} invites={invites} />}
          </section>
        )}

        {member.role === 'owner' && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-content-error">Danger zone</h2>
            <DangerZone workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
          </section>
        )}
      </div>
    </>
  );
}
