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
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';
import { AnalyticsFilters } from './_components/analytics-filters';
import { HeatmapGrid } from './_components/heatmap-grid';
import { LatencyChart } from './_components/latency-chart';
import { QueueTotalsTable } from './_components/queue-totals-table';
import { ThroughputChart } from './_components/throughput-chart';

export const dynamic = 'force-dynamic';

const ranges: AnalyticsRange[] = ['24h', '7d', '30d'];

interface AnalyticsPageProps {
  params: Promise<{ projectSlug: string }>;
  searchParams: Promise<{ connector?: string; range?: string }>;
}

export default async function AnalyticsPage(props: AnalyticsPageProps) {
  const { projectSlug } = await props.params;
  const searchParams = await props.searchParams;
  const { project } = await requireProjectForSlug(projectSlug);
  const connectors = await listConnectors(project._id);

  const firstConnector = connectors[0];
  if (!firstConnector) {
    return (
      <>
        <PageHeader
          title="Analytics"
          subtitle="Throughput, latency, and activity across ingested job events."
        />
        <EmptyState
          icon={<ChartLine className="size-5 text-content-muted" />}
          title="No ingested data yet"
          description="Enroll a connector to start collecting analytics."
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
      projectId: project._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    }),
    getLatencySeries({
      projectId: project._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
      bucketMinutes: window.bucketMinutes,
    }),
    getQueueTotals({
      projectId: project._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
    }),
    getHeatmap({
      projectId: project._id,
      connectorId: selectedConnectorId,
      fromTs: window.fromTs,
      toTs: window.toTs,
    }),
  ]);

  const hasData = throughput.points.some((point) => point.completed > 0 || point.failed > 0);
  const truncated =
    throughput.truncated || latency.truncated || totals.truncated || heatmap.truncated;

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
            {truncated && (
              <p className="text-xs text-content-muted">
                This window holds more events than one query reads — charts are computed from the
                most recent 1,000 events; older activity in the range is not included.
              </p>
            )}
            <ThroughputChart points={throughput.points} />
            <LatencyChart points={latency.points} />
            <QueueTotalsTable totals={totals.totals} />
            <HeatmapGrid matrix={heatmap.matrix} timezone={heatmap.timezone} />
          </>
        ) : (
          <EmptyState
            icon={<ChartLine className="size-5 text-content-muted" />}
            title="No ingested data yet"
            description="Enroll a connector to start collecting analytics."
          />
        )}
      </div>
    </>
  );
}

function isAnalyticsRange(value: string | undefined): value is AnalyticsRange {
  return ranges.includes(value as AnalyticsRange);
}
