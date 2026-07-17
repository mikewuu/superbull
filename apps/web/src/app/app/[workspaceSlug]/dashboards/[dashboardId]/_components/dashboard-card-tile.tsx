'use client';

import { useTransition } from 'react';
import type {
  HeatmapResult,
  LatencyPoint,
  QueueTotal,
  ThroughputPoint,
} from '../../../../../../lib/analytics/types';
import type { DashboardCard } from '../../../../../../lib/dashboards/types';
import { HeatmapGrid } from '../../../analytics/_components/heatmap-grid';
import { LatencyChart } from '../../../analytics/_components/latency-chart';
import { QueueTotalsTable } from '../../../analytics/_components/queue-totals-table';
import { ThroughputChart } from '../../../analytics/_components/throughput-chart';
import { removeDashboardCardAction } from '../../actions';

export type CardData =
  | { type: 'throughput'; points: ThroughputPoint[]; truncated: boolean }
  | { type: 'latency'; points: LatencyPoint[]; truncated: boolean }
  | { type: 'totals'; totals: QueueTotal[]; truncated: boolean }
  | {
      type: 'heatmap';
      matrix: HeatmapResult['matrix'];
      timezone: HeatmapResult['timezone'];
      truncated: boolean;
    };

interface DashboardCardTileProps {
  workspaceSlug: string;
  dashboardId: string;
  cardIndex: number;
  card: DashboardCard;
  connectorName: string;
  data: CardData;
}

export function DashboardCardTile(props: DashboardCardTileProps) {
  const { workspaceSlug, dashboardId, cardIndex, card, connectorName, data } = props;
  const [pending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      await removeDashboardCardAction(workspaceSlug, dashboardId, cardIndex);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-content-subtle">
          {cardLabel(card.type)}: {connectorName}
          {card.queue_name ? ` / ${card.queue_name}` : ''} · {card.range}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          className="text-xs font-medium text-content-muted hover:text-content-error hover:underline disabled:opacity-60"
        >
          Remove
        </button>
      </div>
      {data.type === 'throughput' && <ThroughputChart points={data.points} />}
      {data.type === 'latency' && <LatencyChart points={data.points} />}
      {data.type === 'totals' && <QueueTotalsTable totals={data.totals} />}
      {data.type === 'heatmap' && <HeatmapGrid matrix={data.matrix} timezone={data.timezone} />}
      {data.truncated && (
        <span className="text-[11px] text-content-muted">
          Computed from the most recent 1,000 events in this range.
        </span>
      )}
    </div>
  );
}

function cardLabel(type: DashboardCard['type']): string {
  if (type === 'throughput') {
    return 'Throughput';
  }
  if (type === 'latency') {
    return 'Latency';
  }
  if (type === 'totals') {
    return 'Queue totals';
  }
  return 'Heatmap';
}
