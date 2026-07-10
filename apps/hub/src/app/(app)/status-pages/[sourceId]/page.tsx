import { PageHeader } from '@bullwatch/ui';
import { notFound } from 'next/navigation';
import { findSourceById } from '../../../../lib/sources/find-source-by-id';
import { getStatusPageConfig } from '../../../../lib/status-pages/get-status-page-config';
import { LogoUpload } from '../_components/logo-upload';
import { StatusPageConfigForm } from '../_components/status-page-config-form';

export const dynamic = 'force-dynamic';

interface StatusPageSourcePageProps {
  params: Promise<{ sourceId: string }>;
}

export default async function StatusPageSourcePage(props: StatusPageSourcePageProps) {
  const { params } = props;
  const { sourceId } = await params;

  const source = await findSourceById(sourceId);
  if (!source) {
    notFound();
  }

  const config = await getStatusPageConfig({ sourceId });

  return (
    <>
      <PageHeader title={source.name} subtitle="Public status page" />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
          <StatusPageConfigForm sourceId={sourceId} config={config} />
          {config ? (
            <LogoUpload
              configId={config.id}
              sourceId={sourceId}
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
