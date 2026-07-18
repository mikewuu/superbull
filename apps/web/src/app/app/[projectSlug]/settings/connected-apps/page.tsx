import { PageHeader } from '@superbull/ui';
import Link from 'next/link';
import { requireProjectForSlug } from '../../../../../lib/projects/require-project-for-slug';
import { ConnectedApps } from './_components/connected-apps';

export const dynamic = 'force-dynamic';

interface ConnectedAppsPageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function ConnectedAppsPage(props: ConnectedAppsPageProps) {
  const { projectSlug } = await props.params;
  const { project } = await requireProjectForSlug(projectSlug);

  return (
    <>
      <PageHeader
        title="Connected apps"
        subtitle={project.name}
        controls={
          <Link
            href={`/app/${projectSlug}/settings`}
            className="text-xs font-medium text-content-subtle hover:text-content-emphasis"
          >
            Back to settings
          </Link>
        }
      />
      <div className="flex w-full flex-col gap-3 px-4 py-4 lg:px-6">
        <p className="max-w-2xl text-sm text-content-subtle">
          Apps authorized through OAuth can use SuperBull on your behalf. Revoke access you no
          longer use.
        </p>
        <ConnectedApps />
      </div>
    </>
  );
}
