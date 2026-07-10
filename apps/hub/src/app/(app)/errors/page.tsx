import { EmptyState, PageHeader } from '@bullwatch/ui';
import { AlertTriangle } from 'lucide-react';
import { listErrorGroups } from '../../../lib/errors/list-error-groups';
import type { ErrorGroup } from '../../../lib/errors/types';
import { listSources } from '../../../lib/sources/list-sources';
import { ErrorGroupsTable } from './_components/error-groups-table';
import { SourcePicker } from './_components/source-picker';
import { StateTabs } from './_components/state-tabs';

export const dynamic = 'force-dynamic';

const errorsTabs = ['open', 'regressions', 'resolved', 'ignored'] as const;
export type ErrorsTab = (typeof errorsTabs)[number];

interface ErrorsPageProps {
  searchParams: Promise<{ source?: string; state?: string }>;
}

export default async function ErrorsPage(props: ErrorsPageProps) {
  const { source: sourceParam, state: stateParam } = await props.searchParams;
  const sources = await listSources();
  const activeSourceId = sourceParam ?? sources[0]?.id;
  const activeTab = isErrorsTab(stateParam) ? stateParam : 'open';

  if (!activeSourceId) {
    return (
      <>
        <PageHeader title="Errors" subtitle="Grouped job failures across your sources." />
        <EmptyState
          icon={AlertTriangle}
          title="No sources yet"
          description="Add a source from the Sources page to start tracking errors."
        />
      </>
    );
  }

  const groups = await listErrorGroups({ sourceId: activeSourceId });
  const counts = {
    open: groups.filter((group) => group.state === 'open').length,
    regressions: groups.filter((group) => group.state === 'open' && group.isRegression).length,
    resolved: groups.filter((group) => group.state === 'resolved').length,
    ignored: groups.filter((group) => group.state === 'ignored').length,
  };
  const visibleGroups = filterGroupsByTab(groups, activeTab);

  return (
    <>
      <PageHeader
        title="Errors"
        subtitle="Grouped job failures across your sources."
        controls={<SourcePicker sources={sources} activeSourceId={activeSourceId} />}
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <StateTabs activeSourceId={activeSourceId} activeTab={activeTab} counts={counts} />
        {visibleGroups.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No errors ingested." />
        ) : (
          <ErrorGroupsTable groups={visibleGroups} />
        )}
      </div>
    </>
  );
}

function isErrorsTab(value: string | undefined): value is ErrorsTab {
  return errorsTabs.includes(value as ErrorsTab);
}

function filterGroupsByTab(groups: ErrorGroup[], tab: ErrorsTab): ErrorGroup[] {
  if (tab === 'regressions') {
    return groups.filter((group) => group.state === 'open' && group.isRegression);
  }
  if (tab === 'open') {
    return groups.filter((group) => group.state === 'open');
  }
  return groups.filter((group) => group.state === tab);
}
