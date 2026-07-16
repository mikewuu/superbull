import { EmptyState, PageHeader } from '@superbull/ui';
import { LayoutDashboard } from 'lucide-react';
import { listDashboards } from '../../../../lib/dashboards/list-dashboards';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';
import { CreateDashboardDialog } from './_components/create-dashboard-dialog';
import { DashboardListTable } from './_components/dashboard-list-table';

export const dynamic = 'force-dynamic';

interface DashboardsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function DashboardsPage(props: DashboardsPageProps) {
  const { workspaceSlug } = await props.params;
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const dashboards = await listDashboards(workspace._id);

  return (
    <>
      <PageHeader
        title="Dashboards"
        subtitle="Saved chart layouts you can revisit anytime."
        controls={<CreateDashboardDialog workspaceSlug={workspaceSlug} />}
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {dashboards.length === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="No dashboards yet"
            description="Create one to pin charts you check often."
          />
        ) : (
          <DashboardListTable workspaceSlug={workspaceSlug} dashboards={dashboards} />
        )}
      </div>
    </>
  );
}
