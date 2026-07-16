import { PageHeader } from '@superbull/ui';
import { notFound } from 'next/navigation';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { findConnectorById } from '../../../../../lib/connectors/find-connector-by-id';
import { getStatusPageConfig } from '../../../../../lib/status-pages/get-status-page-config';
import { requireWorkspaceForSlug } from '../../../../../lib/workspaces/require-workspace-for-slug';
import { LogoUpload } from '../_components/logo-upload';
import { StatusPageConfigForm } from '../_components/status-page-config-form';

export const dynamic = 'force-dynamic';

interface StatusPageConnectorPageProps {
  params: Promise<{ workspaceSlug: string; connectorId: string }>;
}

export default async function StatusPageConnectorPage(props: StatusPageConnectorPageProps) {
  const { workspaceSlug, connectorId } = await props.params;
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);

  const connector = await findConnectorById(workspace._id, connectorId as Id<'connectors'>);
  if (!connector) {
    notFound();
  }

  const config = await getStatusPageConfig({
    workspaceId: workspace._id,
    connectorId: connectorId as Id<'connectors'>,
  });

  return (
    <>
      <PageHeader title={connector.name} subtitle="Public status page" />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
          <StatusPageConfigForm
            workspaceSlug={workspaceSlug}
            connectorId={connectorId}
            config={config}
          />
          {config ? (
            <LogoUpload
              workspaceSlug={workspaceSlug}
              configId={config.id}
              connectorId={connectorId}
              hasLogo={config.logoStorageId !== null}
            />
          ) : (
            <div className="candy-card rounded-lg p-4">
              <h2 className="text-sm font-medium text-content-emphasis">Logo</h2>
              <p className="mt-3 text-xs text-content-subtle">
                Save the page first to enable a logo upload.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
