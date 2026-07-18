import { EmptyState, PageHeader } from '@superbull/ui';
import { LayoutDashboard } from 'lucide-react';
import { listDashboards } from '../../../../lib/dashboards/list-dashboards';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';
import { CreateDashboardDialog } from './_components/create-dashboard-dialog';
import { DashboardListTable } from './_components/dashboard-list-table';

export const dynamic = 'force-dynamic';

interface DashboardsPageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function DashboardsPage(props: DashboardsPageProps) {
  const { projectSlug } = await props.params;
  const { project } = await requireProjectForSlug(projectSlug);
  const dashboards = await listDashboards(project._id);

  return (
    <>
      <PageHeader
        title="Dashboards"
        subtitle="Saved chart layouts you can revisit anytime."
        controls={<CreateDashboardDialog projectSlug={projectSlug} />}
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {dashboards.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="size-5 text-content-muted" />}
            title="No dashboards yet"
            description="Create one to pin charts you check often."
          />
        ) : (
          <DashboardListTable projectSlug={projectSlug} dashboards={dashboards} />
        )}
      </div>
    </>
  );
}
