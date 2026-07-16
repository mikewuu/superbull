'use client';

import { cn } from '@superbull/ui';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { format } from 'date-fns';
import { useState } from 'react';
import type { ThroughputPoint } from '../../../../../lib/analytics/types';

interface ThroughputChartProps {
  points: ThroughputPoint[];
}

const completedColor = 'text-candy-green';
const failedColor = 'text-[#e5484d]';

export function ThroughputChart(props: ThroughputChartProps) {
  const { points } = props;
  const totalCompleted = sum(points.map((point) => point.completed));
  const totalFailed = sum(points.map((point) => point.failed));
  const isEmpty = totalCompleted + totalFailed === 0;

  return (
    <div className="candy-card flex flex-col gap-4 rounded-lg px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-2sm font-medium text-content-emphasis">Throughput</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[26px] font-semibold tracking-tight tabular-nums text-content-emphasis">
              {(totalCompleted + totalFailed).toLocaleString()}
            </span>
            <span className="text-xs text-content-subtle">jobs in range</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LegendChip colorClassName="bg-candy-green" label="Completed" />
          <LegendChip colorClassName="bg-[#e5484d]" label="Failed" />
        </div>
      </div>

      <div className="h-56">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-xs text-content-muted">
            No activity in this range.
          </div>
        ) : (
          <ParentSize>
            {({ width, height }) => (
              <ThroughputPlot width={width} height={height} points={points} />
            )}
          </ParentSize>
        )}
      </div>
    </div>
  );
}

function LegendChip(props: { colorClassName: string; label: string }) {
  const { colorClassName, label } = props;

  return (
    <span className="flex items-center gap-1.5 text-xs text-content-subtle">
      <span className={cn('size-2 rounded-full', colorClassName)} />
      {label}
    </span>
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const margin = { top: 16, right: 8, bottom: 20, left: 8 };
const gridLineCount = 4;

function ThroughputPlot(props: { width: number; height: number; points: ThroughputPoint[] }) {
  const { width, height, points } = props;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const pointCount = points.length;
  const firstPoint = points[0];
  const lastPoint = points[pointCount - 1];
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(
    ...points.map((point) => point.completed),
    ...points.map((point) => point.failed),
    1,
  );

  const xScale = scaleLinear({
    domain: [0, pointCount - 1],
    range: [margin.left, margin.left + innerWidth],
  });
  const yScale = scaleLinear({
    domain: [0, maxValue],
    range: [margin.top + innerHeight, margin.top],
  });

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - margin.left;
    const index = Math.round((x / innerWidth) * (pointCount - 1));
    setHoverIndex(Math.max(0, Math.min(pointCount - 1, index)));
  };

  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Completed and failed jobs over the selected range"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <LinearGradient
          id="analytics-throughput-completed"
          from="currentColor"
          to="currentColor"
          fromOpacity={0.15}
          toOpacity={0}
          className={completedColor}
        />

        {Array.from({ length: gridLineCount }, (_, index) => {
          const y = margin.top + (innerHeight / (gridLineCount - 1)) * index;
          const tickValue = Math.round(maxValue - (maxValue / (gridLineCount - 1)) * index);
          return (
            <g key={y}>
              <line
                x1={margin.left}
                x2={margin.left + innerWidth}
                y1={y}
                y2={y}
                stroke="rgb(var(--border-subtle))"
                strokeDasharray="2 4"
              />
              {index < gridLineCount - 1 && (
                <text
                  x={margin.left + innerWidth}
                  y={y - 4}
                  textAnchor="end"
                  className="fill-content-muted font-mono text-[10px] tabular-nums"
                >
                  {tickValue}
                </text>
              )}
            </g>
          );
        })}

        <g className={completedColor}>
          <AreaClosed
            data={points}
            x={(_, index) => xScale(index)}
            y={(point) => yScale(point.completed)}
            yScale={yScale}
            curve={curveMonotoneX}
            fill="url(#analytics-throughput-completed)"
          />
          <LinePath
            data={points}
            x={(_, index) => xScale(index)}
            y={(point) => yScale(point.completed)}
            curve={curveMonotoneX}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g className={failedColor}>
          <LinePath
            data={points}
            x={(_, index) => xScale(index)}
            y={(point) => yScale(point.failed)}
            curve={curveMonotoneX}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {hoverIndex !== null && (
          <g>
            <line
              x1={xScale(hoverIndex)}
              x2={xScale(hoverIndex)}
              y1={margin.top}
              y2={margin.top + innerHeight}
              stroke="rgb(var(--content-muted))"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
            />
            {hoverPoint && (
              <>
                <circle
                  cx={xScale(hoverIndex)}
                  cy={yScale(hoverPoint.completed)}
                  r={3.5}
                  className={completedColor}
                  fill="currentColor"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                <circle
                  cx={xScale(hoverIndex)}
                  cy={yScale(hoverPoint.failed)}
                  r={3.5}
                  className={failedColor}
                  fill="currentColor"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              </>
            )}
          </g>
        )}

        <text x={margin.left} y={height - 4} className="fill-content-muted font-mono text-[10px]">
          {firstPoint ? format(firstPoint.bucket_ts, 'MMM d HH:mm') : ''}
        </text>
        <text
          x={margin.left + innerWidth}
          y={height - 4}
          textAnchor="end"
          className="fill-content-muted font-mono text-[10px]"
        >
          {lastPoint ? format(lastPoint.bucket_ts, 'MMM d HH:mm') : ''}
        </text>
      </svg>

      {hoverPoint && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-subtle bg-white px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: xScale(hoverIndex ?? 0) }}
        >
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-candy-green" />
            <span className="font-mono font-medium text-content-emphasis">
              {hoverPoint.completed}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#e5484d]" />
            <span className="font-mono font-medium text-content-emphasis">{hoverPoint.failed}</span>
          </div>
          <div className="mt-0.5 text-content-subtle">
            {format(hoverPoint.bucket_ts, 'MMM d HH:mm')}
          </div>
        </div>
      )}
    </div>
  );
}
