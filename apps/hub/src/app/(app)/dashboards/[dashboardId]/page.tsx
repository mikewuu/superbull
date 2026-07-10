import { EmptyState, PageHeader } from '@bullwatch/ui';
import { LayoutDashboard } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getHeatmap } from '../../../../lib/analytics/get-heatmap';
import { getLatencySeries } from '../../../../lib/analytics/get-latency-series';
import { getQueueTotals } from '../../../../lib/analytics/get-queue-totals';
import { getRangeWindow } from '../../../../lib/analytics/get-range-window';
import { getThroughputSeries } from '../../../../lib/analytics/get-throughput-series';
import { findDashboardById } from '../../../../lib/dashboards/find-dashboard-by-id';
import type { DashboardCard } from '../../../../lib/dashboards/types';
import { listSources } from '../../../../lib/sources/list-sources';
import type { ProxySource } from '../../../../lib/sources/types';
import { AddCardDialog } from './_components/add-card-dialog';
import type { CardData } from './_components/dashboard-card-tile';
import { DashboardCardTile } from './_components/dashboard-card-tile';
import { DeleteDashboardButton } from './_components/delete-dashboard-button';

export const dynamic = 'force-dynamic';

interface DashboardDetailPageProps {
  params: Promise<{ dashboardId: string }>;
}

export default async function DashboardDetailPage(props: DashboardDetailPageProps) {
  const { dashboardId } = await props.params;
  const [dashboard, sources] = await Promise.all([findDashboardById(dashboardId), listSources()]);

  if (!dashboard) {
    notFound();
  }

  const cards = await Promise.all(
    dashboard.cards.map(async (card) => ({ card, data: await loadCardData(card) })),
  );

  return (
    <>
      <PageHeader
        title={dashboard.name}
        subtitle="Saved dashboard"
        controls={
          <>
            <AddCardDialog dashboardId={dashboard.id} sources={sources} />
            <DeleteDashboardButton dashboardId={dashboard.id} dashboardName={dashboard.name} />
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
                dashboardId={dashboard.id}
                cardIndex={index}
                card={card}
                sourceName={findSourceName(sources, card.source_id)}
                data={data}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function findSourceName(sources: ProxySource[], sourceId: string): string {
  return sources.find((source) => source.id === sourceId)?.name ?? 'Unknown source';
}

async function loadCardData(card: DashboardCard): Promise<CardData> {
  const window = getRangeWindow(card.range, Date.now());

  if (card.type === 'throughput') {
    const points = await getThroughputSeries({
      sourceId: card.source_id,
      queueName: card.queue_name,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    });
    return { type: 'throughput', points };
  }

  if (card.type === 'latency') {
    const points = await getLatencySeries({
      sourceId: card.source_id,
      queueName: card.queue_name,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    });
    return { type: 'latency', points };
  }

  if (card.type === 'totals') {
    const totals = await getQueueTotals({
      sourceId: card.source_id,
      fromTs: window.fromTs,
      toTs: window.toTs,
    });
    return { type: 'totals', totals };
  }

  const heatmap = await getHeatmap({
    sourceId: card.source_id,
    fromTs: window.fromTs,
    toTs: window.toTs,
  });
  return { type: 'heatmap', matrix: heatmap.matrix, timezone: heatmap.timezone };
}
