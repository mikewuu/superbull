import { EmptyState, PageHeader } from '@superbull/ui';
import { LayoutDashboard } from 'lucide-react';
import { listDashboards } from '../../../lib/dashboards/list-dashboards';
import { CreateDashboardDialog } from './_components/create-dashboard-dialog';
import { DashboardListTable } from './_components/dashboard-list-table';

export const dynamic = 'force-dynamic';

export default async function DashboardsPage() {
  const dashboards = await listDashboards();

  return (
    <>
      <PageHeader
        title="Dashboards"
        subtitle="Saved chart layouts you can revisit anytime."
        controls={<CreateDashboardDialog />}
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {dashboards.length === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="No dashboards yet"
            description="Create one to pin charts you check often."
          />
        ) : (
          <DashboardListTable dashboards={dashboards} />
        )}
      </div>
    </>
  );
}
