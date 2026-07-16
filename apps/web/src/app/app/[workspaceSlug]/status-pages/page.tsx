import { EmptyState, PageHeader, StatusBadge } from '@superbull/ui';
import { Globe } from 'lucide-react';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import type { Connector } from '../../../../lib/connectors/types';
import { getStatusPageConfig } from '../../../../lib/status-pages/get-status-page-config';
import type { StatusPageConfig } from '../../../../lib/status-pages/types';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';

export const dynamic = 'force-dynamic';

interface StatusPageRow {
  connector: Connector;
  config: StatusPageConfig | null;
}

interface StatusPagesPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function StatusPagesPage(props: StatusPagesPageProps) {
  const { workspaceSlug } = await props.params;
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const connectors = await listConnectors(workspace._id);
  const rows = await getStatusPageRows(workspace._id, connectors);

  return (
    <>
      <PageHeader
        title="Status pages"
        subtitle="Public uptime pages you can share with customers."
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Globe className="size-5 text-content-muted" />}
            title="No connectors yet"
            description="Add a connector before you can publish a status page."
          />
        ) : (
          <div className="candy-card overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-2sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
                  <th className="px-5 py-2.5 font-medium">Connector</th>
                  <th className="w-32 px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Slug</th>
                  <th className="w-28 px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.connector.id}
                    className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
                  >
                    <td className="px-5 py-3 font-medium text-content-emphasis">
                      {row.connector.name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPageStatusBadge config={row.config} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-content-subtle">
                      {row.config?.isEnabled ? (
                        <a href={`/status/${row.config.slug}`} className="hover:underline">
                          /status/{row.config.slug}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={`/app/${workspaceSlug}/status-pages/${row.connector.id}`}
                        className="text-xs font-medium text-content-muted hover:text-content-emphasis hover:underline"
                      >
                        Configure
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

async function getStatusPageRows(
  workspaceId: Id<'workspaces'>,
  connectors: Connector[],
): Promise<StatusPageRow[]> {
  const configs = await Promise.all(
    connectors.map((connector) =>
      getStatusPageConfig({ workspaceId, connectorId: connector.id as Id<'connectors'> }),
    ),
  );
  return connectors.map((connector, index) => ({ connector, config: configs[index] ?? null }));
}

function StatusPageStatusBadge(props: { config: StatusPageConfig | null }) {
  const { config } = props;

  if (!config) {
    return <StatusBadge variant="neutral">Not configured</StatusBadge>;
  }
  if (config.isEnabled) {
    return <StatusBadge variant="success">Enabled</StatusBadge>;
  }
  return <StatusBadge variant="neutral">Disabled</StatusBadge>;
}
