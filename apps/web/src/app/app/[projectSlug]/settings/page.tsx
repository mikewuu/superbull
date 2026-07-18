import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { PageHeader } from '@superbull/ui';
import { fetchQuery } from 'convex/nextjs';
import Link from 'next/link';
import { api } from '../../../../../convex/_generated/api';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';
import { ApiKeysSection } from './_components/api-keys-section';
import { DangerZone } from './_components/danger-zone';
import { InviteForm } from './_components/invite-form';
import { InvitesTable } from './_components/invites-table';
import { MembersTable } from './_components/members-table';

export const dynamic = 'force-dynamic';

interface SettingsPageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function SettingsPage(props: SettingsPageProps) {
  const { projectSlug } = await props.params;
  const { project, member } = await requireProjectForSlug(projectSlug);
  const canManage = member.role === 'owner' || member.role === 'admin';

  const token = await convexAuthNextjsToken();
  const [members, invites, apiKeys] = await Promise.all([
    fetchQuery(api.projects.listMembers, { projectId: project._id }, { token }),
    fetchQuery(api.invites.listByProject, { projectId: project._id }, { token }),
    fetchQuery(api.apiKeys.listApiKeys, {}, { token }),
  ]);

  return (
    <>
      <PageHeader title="Settings" subtitle={project.name} />
      <div className="flex w-full flex-col gap-6 px-4 py-4 lg:px-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-content-emphasis">Members</h2>
          <MembersTable
            projectSlug={projectSlug}
            members={members}
            canManage={canManage}
            currentUserId={member.userId}
          />
        </section>

        {canManage && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-content-emphasis">Invite by email</h2>
            <InviteForm projectSlug={projectSlug} />
            {invites.length > 0 && <InvitesTable projectSlug={projectSlug} invites={invites} />}
          </section>
        )}

        <ApiKeysSection projectSlug={projectSlug} apiKeys={apiKeys} />

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium text-content-emphasis">Connected apps</h2>
            <p className="mt-1 text-xs text-content-subtle">
              Review and revoke apps authorized through OAuth.
            </p>
          </div>
          <Link
            href={`/app/${projectSlug}/settings/connected-apps`}
            className="candy-card rounded-lg px-4 py-3 text-sm font-medium text-content-emphasis hover:bg-bg-subtle"
          >
            Manage connected apps
          </Link>
        </section>

        {member.role === 'owner' && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-content-error">Danger zone</h2>
            <DangerZone projectSlug={projectSlug} projectName={project.name} />
          </section>
        )}
      </div>
    </>
  );
}
