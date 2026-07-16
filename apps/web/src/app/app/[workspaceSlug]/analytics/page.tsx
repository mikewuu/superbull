import { EmptyState, PageHeader } from '@superbull/ui';
import { ChartLine } from 'lucide-react';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { getHeatmap } from '../../../../lib/analytics/get-heatmap';
import { getLatencySeries } from '../../../../lib/analytics/get-latency-series';
import { getQueueTotals } from '../../../../lib/analytics/get-queue-totals';
import { getRangeWindow } from '../../../../lib/analytics/get-range-window';
import { getThroughputSeries } from '../../../../lib/analytics/get-throughput-series';
import type { AnalyticsRange } from '../../../../lib/analytics/types';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';
import { AnalyticsFilters } from './_components/analytics-filters';
import { HeatmapGrid } from './_components/heatmap-grid';
import { LatencyChart } from './_components/latency-chart';
import { QueueTotalsTable } from './_components/queue-totals-table';
import { ThroughputChart } from './_components/throughput-chart';

export const dynamic = 'force-dynamic';

const ranges: AnalyticsRange[] = ['24h', '7d', '30d'];

interface AnalyticsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ connector?: string; range?: string }>;
}

export default async function AnalyticsPage(props: AnalyticsPageProps) {
  const { workspaceSlug } = await props.params;
  const searchParams = await props.searchParams;
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const connectors = await listConnectors(workspace._id);

  const firstConnector = connectors[0];
  if (!firstConnector) {
    return (
      <>
        <PageHeader
          title="Analytics"
          subtitle="Throughput, latency, and activity across ingested job events."
        />
        <EmptyState
          icon={ChartLine}
          title="No ingested data yet"
          description="Connect a proxy with ingest enabled."
        />
      </>
    );
  }

  const selectedConnectorId = (connectors.find(
    (connector) => connector.id === searchParams.connector,
  )?.id ?? firstConnector.id) as Id<'connectors'>;
  const selectedRange = isAnalyticsRange(searchParams.range) ? searchParams.range : '24h';

  const window = getRangeWindow(selectedRange, Date.now());
  const [throughput, latency, totals, heatmap] = await Promise.all([
    getThroughputSeries({
      workspaceId: workspace._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    }),
    getLatencySeries({
      workspaceId: workspace._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    }),
    getQueueTotals({
      workspaceId: workspace._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
    }),
    getHeatmap({
      workspaceId: workspace._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
    }),
  ]);

  const hasData = throughput.some((point) => point.completed > 0 || point.failed > 0);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Throughput, latency, and activity across ingested job events."
        controls={
          <AnalyticsFilters
            connectors={connectors}
            selectedConnectorId={selectedConnectorId}
            selectedRange={selectedRange}
          />
        }
      />
      <div className="flex w-full flex-col gap-5 px-4 py-4 lg:px-6">
        {hasData ? (
          <>
            <ThroughputChart points={throughput} />
            <LatencyChart points={latency} />
            <QueueTotalsTable totals={totals} />
            <HeatmapGrid matrix={heatmap.matrix} timezone={heatmap.timezone} />
          </>
        ) : (
          <EmptyState
            icon={ChartLine}
            title="No ingested data yet"
            description="Connect a proxy with ingest enabled."
          />
        )}
      </div>
    </>
  );
}

function isAnalyticsRange(value: string | undefined): value is AnalyticsRange {
  return ranges.includes(value as AnalyticsRange);
}
