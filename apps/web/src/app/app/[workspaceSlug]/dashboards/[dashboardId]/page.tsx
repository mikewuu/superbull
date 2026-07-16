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
import { requireWorkspaceForSlug } from '../../../../../lib/workspaces/require-workspace-for-slug';
import { AddCardDialog } from './_components/add-card-dialog';
import type { CardData } from './_components/dashboard-card-tile';
import { DashboardCardTile } from './_components/dashboard-card-tile';
import { DeleteDashboardButton } from './_components/delete-dashboard-button';

export const dynamic = 'force-dynamic';

interface DashboardDetailPageProps {
  params: Promise<{ workspaceSlug: string; dashboardId: string }>;
}

export default async function DashboardDetailPage(props: DashboardDetailPageProps) {
  const { workspaceSlug, dashboardId } = await props.params;
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const [dashboard, connectors] = await Promise.all([
    findDashboardById(workspace._id, dashboardId as Id<'savedDashboards'>),
    listConnectors(workspace._id),
  ]);

  if (!dashboard) {
    notFound();
  }

  const cards = await Promise.all(
    dashboard.cards.map(async (card) => ({
      card,
      data: await loadCardData(workspace._id, card),
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
              workspaceSlug={workspaceSlug}
              dashboardId={dashboard.id}
              connectors={connectors}
            />
            <DeleteDashboardButton
              workspaceSlug={workspaceSlug}
              dashboardId={dashboard.id}
              dashboardName={dashboard.name}
            />
          </>
        }
      />
      <div className="px-4 py-4 lg:px-6">
        {dashboard.cards.length === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="No cards yet"
            description="Add a chart card to start building this dashboard."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {cards.map(({ card, data }, index) => (
              <DashboardCardTile
                // biome-ignore lint/suspicious/noArrayIndexKey: cards have no stable id, position is the identity
                key={index}
                workspaceSlug={workspaceSlug}
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

async function loadCardData(workspaceId: Id<'workspaces'>, card: DashboardCard): Promise<CardData> {
  const window = getRangeWindow(card.range, Date.now());
  const connectorId = card.connector_id as Id<'connectors'>;

  if (card.type === 'throughput') {
    const points = await getThroughputSeries({
      workspaceId,
      connectorId,
      queueName: card.queue_name,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    });
    return { type: 'throughput', points };
  }

  if (card.type === 'latency') {
    const points = await getLatencySeries({
      workspaceId,
      connectorId,
      queueName: card.queue_name,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    });
    return { type: 'latency', points };
  }

  if (card.type === 'totals') {
    const totals = await getQueueTotals({
      workspaceId,
      connectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
    });
    return { type: 'totals', totals };
  }

  const heatmap = await getHeatmap({
    workspaceId,
    connectorId,
    fromTs: window.fromTs,
    toTs: window.toTs,
  });
  return { type: 'heatmap', matrix: heatmap.matrix, timezone: heatmap.timezone };
}
