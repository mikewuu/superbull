import { EmptyState, PageHeader } from '@superbull/ui';
import { LayoutDashboard } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { getHeatmap } from '../../../../../lib/analytics/get-heatmap';
import { getLatencySeries } from '../../../../../lib/analytics/get-latency-series';
import { getQueueTotals } from '../../../../../lib/analytics/get-queue-totals';
import { getRangeWindow } from '../../../../../lib/analytics/get-range-window';
import { getThroughputSeries } from '../../../../../lib/analytics/get-throughput-series';
import { listConnectors } from '../../../../../lib/connectors/list-connectors';
import type { Connector } from '../../../../../lib/connectors/types';
import { findDashboardById } from '../../../../../lib/dashboards/find-dashboard-by-id';
import type { DashboardCard } from '../../../../../lib/dashboards/types';
import { requireProjectForSlug } from '../../../../../lib/projects/require-project-for-slug';
import { AddCardDialog } from './_components/add-card-dialog';
import type { CardData } from './_components/dashboard-card-tile';
import { DashboardCardTile } from './_components/dashboard-card-tile';
import { DeleteDashboardButton } from './_components/delete-dashboard-button';

export const dynamic = 'force-dynamic';

interface DashboardDetailPageProps {
  params: Promise<{ projectSlug: string; dashboardId: string }>;
}

export default async function DashboardDetailPage(props: DashboardDetailPageProps) {
  const { projectSlug, dashboardId } = await props.params;
  const { project } = await requireProjectForSlug(projectSlug);
  const [dashboard, connectors] = await Promise.all([
    findDashboardById(project._id, dashboardId as Id<'savedDashboards'>),
    listConnectors(project._id),
  ]);

  if (!dashboard) {
    notFound();
  }

  const cards = await Promise.all(
    dashboard.cards.map(async (card) => ({
      card,
      data: await loadCardData(project._id, card),
    })),
  );

  return (
    <>
      <PageHeader
        title={dashboard.name}
        subtitle="Saved dashboard"
        controls={
          <>
            <AddCardDialog
              projectSlug={projectSlug}
              dashboardId={dashboard.id}
              connectors={connectors}
            />
            <DeleteDashboardButton
              projectSlug={projectSlug}
              dashboardId={dashboard.id}
              dashboardName={dashboard.name}
            />
          </>
        }
      />
      <div className="px-4 py-4 lg:px-6">
        {dashboard.cards.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="size-5 text-content-muted" />}
            title="No cards yet"
            description="Add a chart card to start building this dashboard."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {cards.map(({ card, data }, index) => (
              <DashboardCardTile
                // biome-ignore lint/suspicious/noArrayIndexKey: cards have no stable id, position is the identity
                key={index}
                projectSlug={projectSlug}
                dashboardId={dashboard.id}
                cardIndex={index}
                card={card}
                connectorName={findConnectorName(connectors, card.connector_id)}
                data={data}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function findConnectorName(connectors: Connector[], connectorId: string): string {
  return connectors.find((connector) => connector.id === connectorId)?.name ?? 'Unknown connector';
}

async function loadCardData(projectId: Id<'projects'>, card: DashboardCard): Promise<CardData> {
  const window = getRangeWindow(card.range, Date.now());
  const connectorId = card.connector_id as Id<'connectors'>;

  if (card.type === 'throughput') {
    const series = await getThroughputSeries({
      projectId,
      connectorId,
      queueName: card.queue_name,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    });
    return { type: 'throughput', points: series.points, truncated: series.truncated };
  }

  if (card.type === 'latency') {
    const series = await getLatencySeries({
      projectId,
      connectorId,
      queueName: card.queue_name,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    });
    return { type: 'latency', points: series.points, truncated: series.truncated };
  }

  if (card.type === 'totals') {
    const result = await getQueueTotals({
      projectId,
      connectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
    });
    return { type: 'totals', totals: result.totals, truncated: result.truncated };
  }

  const heatmap = await getHeatmap({
    projectId,
    connectorId,
    fromTs: window.fromTs,
    toTs: window.toTs,
  });
  return {
    type: 'heatmap',
    matrix: heatmap.matrix,
    timezone: heatmap.timezone,
    truncated: heatmap.truncated,
  };
}
