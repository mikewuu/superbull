import { LinearGradient } from '@visx/gradient';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useQueueMetrics } from '../../../hooks/use-queue-metrics';
import type { MetricsType } from '../../../lib/api-types';

interface MetricsChartProps {
  queueName: string;
  type: MetricsType;
}

interface ChartTheme {
  label: string;
  stroke: string;
  gradientId: string;
}

const themes: Record<MetricsType, ChartTheme> = {
  completed: { label: 'Completed / min', stroke: '#16a34a', gradientId: 'metrics-completed' },
  failed: { label: 'Failed / min', stroke: '#dc2626', gradientId: 'metrics-failed' },
};

export function MetricsChart(props: MetricsChartProps) {
  const { queueName, type } = props;
  const { data } = useQueueMetrics({ queueName, type });
  const points = [...(data?.data ?? [])].reverse();
  const theme = themes[type];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-bg-default p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-content-emphasis">{theme.label}</span>
        <span className="font-mono text-lg font-medium text-content-emphasis">
          {data?.count ?? 0}
        </span>
      </div>
      <div className="h-24">
        {points.length > 1 ? (
          <ParentSize>
            {({ width, height }) => (
              <MetricsArea width={width} height={height} points={points} theme={theme} />
            )}
          </ParentSize>
        ) : (
          <div className="flex h-full items-center text-xs text-content-muted">
            Not enough data yet.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricsArea(props: {
  width: number;
  height: number;
  points: number[];
  theme: ChartTheme;
}) {
  const { width, height, points, theme } = props;
  const xScale = scaleLinear({ domain: [0, points.length - 1], range: [0, width] });
  const yScale = scaleLinear({ domain: [0, Math.max(...points, 1)], range: [height, 0] });

  return (
    <svg width={width} height={height} role="img" aria-label={theme.label}>
      <LinearGradient
        id={theme.gradientId}
        from={theme.stroke}
        to={theme.stroke}
        fromOpacity={0.2}
        toOpacity={0}
      />
      <Group>
        <AreaClosed
          data={points}
          x={(_, index) => xScale(index)}
          y={(value) => yScale(value)}
          yScale={yScale}
          fill={`url(#${theme.gradientId})`}
        />
        <LinePath
          data={points}
          x={(_, index) => xScale(index)}
          y={(value) => yScale(value)}
          stroke={theme.stroke}
          strokeWidth={2}
        />
      </Group>
    </svg>
  );
}
