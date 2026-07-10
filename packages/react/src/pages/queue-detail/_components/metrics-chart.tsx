import { cn } from '@superbull/ui';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useState } from 'react';
import { useQueueMetrics } from '../../../hooks/use-queue-metrics';
import type { MetricsType } from '../../../lib/api-types';

interface MetricsChartProps {
  queueName: string;
  type: MetricsType;
}

export function MetricsChart(props: MetricsChartProps) {
  const { queueName, type } = props;
  const { data } = useQueueMetrics({ queueName, type });
  const points = [...(data?.data ?? [])].reverse();

  return (
    <div data-testid={`metrics-${type}`} className="flex flex-col gap-1 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] text-content-subtle">
          {type === 'completed' ? 'Completed' : 'Failed'}
          <span className="ml-1 text-content-muted">/ min</span>
        </span>
        <span
          className={cn(
            'font-mono text-[17px] font-semibold tracking-tight text-content-emphasis',
            { 'text-content-error': type === 'failed' && (data?.meta.count ?? 0) > 0 },
          )}
        >
          {(data?.meta.count ?? 0).toLocaleString()}
        </span>
      </div>
      <div className="h-20">
        {points.length > 1 ? (
          <ParentSize>
            {({ width, height }) => (
              <MetricsArea
                width={width}
                height={height}
                points={points}
                type={type}
                gradientId={`metrics-${queueName}-${type}`}
              />
            )}
          </ParentSize>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-content-muted">
            No recent activity.
          </div>
        )}
      </div>
    </div>
  );
}

const margin = { top: 12, right: 2, bottom: 14, left: 2 };

function MetricsArea(props: {
  width: number;
  height: number;
  points: number[];
  type: MetricsType;
  gradientId: string;
}) {
  const { width, height, points, type, gradientId } = props;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...points, 1);
  const xScale = scaleLinear({
    domain: [0, points.length - 1],
    range: [margin.left, margin.left + innerWidth],
  });
  const yScale = scaleLinear({
    domain: [0, maxValue],
    range: [margin.top + innerHeight, margin.top],
  });
  const hoverValue = hoverIndex === null ? null : points[hoverIndex];
  const colorClassName = type === 'completed' ? 'text-candy-green' : 'text-[#e5484d]';

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - margin.left;
    const index = Math.round((x / innerWidth) * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  };

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${type} jobs per minute`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <LinearGradient
          id={gradientId}
          from="currentColor"
          to="currentColor"
          fromOpacity={0.22}
          toOpacity={0.02}
          className={colorClassName}
        />

        {Array.from({ length: 3 }, (_, index) => {
          const y = margin.top + (innerHeight / 2) * index;
          return (
            <line
              key={y}
              x1={margin.left}
              x2={margin.left + innerWidth}
              y1={y}
              y2={y}
              stroke="rgb(var(--border-subtle))"
              strokeDasharray="2 4"
            />
          );
        })}
        <text
          x={margin.left + innerWidth}
          y={yScale(maxValue) - 4}
          textAnchor="end"
          className="fill-content-muted font-mono text-[10px]"
        >
          {Math.round(maxValue)}
        </text>

        <g className={colorClassName}>
          <AreaClosed
            data={points}
            x={(_, index) => xScale(index)}
            y={(value) => yScale(value)}
            yScale={yScale}
            curve={curveMonotoneX}
            fill={`url(#${gradientId})`}
          />
          <LinePath
            data={points}
            x={(_, index) => xScale(index)}
            y={(value) => yScale(value)}
            curve={curveMonotoneX}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {hoverIndex !== null && hoverValue !== undefined && hoverValue !== null && (
          <g className={colorClassName}>
            <line
              x1={xScale(hoverIndex)}
              x2={xScale(hoverIndex)}
              y1={margin.top}
              y2={margin.top + innerHeight}
              stroke="rgb(var(--content-muted))"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
            />
            <circle
              cx={xScale(hoverIndex)}
              cy={yScale(hoverValue)}
              r={3.5}
              fill="currentColor"
              stroke="#fff"
              strokeWidth={1.5}
            />
          </g>
        )}

        <text x={margin.left} y={height - 2} className="fill-content-muted font-mono text-[10px]">
          {points.length - 1}m ago
        </text>
        <text
          x={margin.left + innerWidth}
          y={height - 2}
          textAnchor="end"
          className="fill-content-muted font-mono text-[10px]"
        >
          now
        </text>
      </svg>

      {hoverIndex !== null && hoverValue !== undefined && hoverValue !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border-subtle bg-white px-2 py-0.5 text-xs shadow-sm"
          style={{ left: xScale(hoverIndex) }}
        >
          <span className="font-mono font-medium text-content-emphasis">{hoverValue}</span>
          <span className="ml-1 text-content-subtle">
            {points.length - 1 - hoverIndex === 0
              ? 'now'
              : `${points.length - 1 - hoverIndex}m ago`}
          </span>
        </div>
      )}
    </div>
  );
}
