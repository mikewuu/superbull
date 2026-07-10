import { EmptyState, PageHeader, StatusBadge } from '@superbull/ui';
import { Globe } from 'lucide-react';
import { listSources } from '../../../lib/sources/list-sources';
import type { ProxySource } from '../../../lib/sources/types';
import { getStatusPageConfig } from '../../../lib/status-pages/get-status-page-config';
import type { StatusPageConfig } from '../../../lib/status-pages/types';

export const dynamic = 'force-dynamic';

interface StatusPageRow {
  source: ProxySource;
  config: StatusPageConfig | null;
}

export default async function StatusPagesPage() {
  const sources = await listSources();
  const rows = await getStatusPageRows(sources);

  return (
    <>
      <PageHeader
        title="Status pages"
        subtitle="Public uptime pages you can share with customers."
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No sources yet"
            description="Add a source before you can publish a status page."
          />
        ) : (
          <div className="candy-card overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-2sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
                  <th className="px-5 py-2.5 font-medium">Source</th>
                  <th className="w-32 px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Slug</th>
                  <th className="w-28 px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.source.id}
                    className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
                  >
                    <td className="px-5 py-3 font-medium text-content-emphasis">
                      {row.source.name}
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
                        href={`/status-pages/${row.source.id}`}
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

async function getStatusPageRows(sources: ProxySource[]): Promise<StatusPageRow[]> {
  const configs = await Promise.all(
    sources.map((source) => getStatusPageConfig({ sourceId: source.id })),
  );
  return sources.map((source, index) => ({ source, config: configs[index] ?? null }));
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
