import { EmptyState, PageHeader } from '@superbull/ui';
import { AlertTriangle } from 'lucide-react';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import { listErrorGroups } from '../../../../lib/errors/list-error-groups';
import type { ErrorGroup } from '../../../../lib/errors/types';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';
import { ConnectorPicker } from './_components/connector-picker';
import { ErrorGroupsTable } from './_components/error-groups-table';
import { StateTabs } from './_components/state-tabs';

export const dynamic = 'force-dynamic';

const errorsTabs = ['open', 'regressions', 'resolved', 'ignored'] as const;
export type ErrorsTab = (typeof errorsTabs)[number];

interface ErrorsPageProps {
  params: Promise<{ projectSlug: string }>;
  searchParams: Promise<{ connector?: string; state?: string }>;
}

export default async function ErrorsPage(props: ErrorsPageProps) {
  const { projectSlug } = await props.params;
  const { connector: connectorParam, state: stateParam } = await props.searchParams;
  const { project } = await requireProjectForSlug(projectSlug);
  const connectors = await listConnectors(project._id);
  const activeConnectorId = connectorParam ?? connectors[0]?.id;
  const activeTab = isErrorsTab(stateParam) ? stateParam : 'open';

  if (!activeConnectorId) {
    return (
      <>
        <PageHeader title="Errors" subtitle="Grouped job failures across your connectors." />
        <EmptyState
          icon={<AlertTriangle className="size-5 text-content-muted" />}
          title="No connectors yet"
          description="Add a connector from the Connectors page to start tracking errors."
        />
      </>
    );
  }

  const groups = await listErrorGroups({
    projectId: project._id,
    connectorId: activeConnectorId as Id<'connectors'>,
  });
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
        subtitle="Grouped job failures across your connectors."
        controls={
          <ConnectorPicker
            projectSlug={projectSlug}
            connectors={connectors}
            activeConnectorId={activeConnectorId}
          />
        }
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <StateTabs
          projectSlug={projectSlug}
          activeConnectorId={activeConnectorId}
          activeTab={activeTab}
          counts={counts}
        />
        {visibleGroups.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="size-5 text-content-muted" />}
            title="No errors ingested."
          />
        ) : (
          <ErrorGroupsTable projectSlug={projectSlug} groups={visibleGroups} />
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
