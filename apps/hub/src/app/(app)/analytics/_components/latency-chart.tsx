'use client';

import { cn } from '@bullwatch/ui';
import { curveMonotoneX } from '@visx/curve';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { format } from 'date-fns';
import { useState } from 'react';
import type { LatencyPoint } from '../../../../lib/analytics/types';

interface LatencyChartProps {
  points: LatencyPoint[];
}

const waitColor = 'text-candy-blue';
const runColor = 'text-candy-yellow';

export function LatencyChart(props: LatencyChartProps) {
  const { points } = props;
  const isEmpty = points.every((point) => point.wait_p95 === null && point.run_p95 === null);

  return (
    <div className="candy-card flex flex-col gap-4 rounded-lg px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <span className="text-2sm font-medium text-content-emphasis">Latency (p95)</span>
        <div className="flex items-center gap-4">
          <LegendChip colorClassName="bg-candy-blue" label="Wait p95" />
          <LegendChip colorClassName="bg-candy-yellow" label="Run p95" />
        </div>
      </div>

      <div className="h-56">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-xs text-content-muted">
            No completed jobs with durations in this range.
          </div>
        ) : (
          <ParentSize>
            {({ width, height }) => <LatencyPlot width={width} height={height} points={points} />}
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

const margin = { top: 16, right: 8, bottom: 20, left: 8 };
const gridLineCount = 4;

function LatencyPlot(props: { width: number; height: number; points: LatencyPoint[] }) {
  const { width, height, points } = props;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const pointCount = points.length;
  const firstPoint = points[0];
  const lastPoint = points[pointCount - 1];
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const definedValues = points.flatMap((point) =>
    [point.wait_p95, point.run_p95].filter((value): value is number => value !== null),
  );
  const maxValue = Math.max(...definedValues, 1);

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
        aria-label="Wait and run p95 latency over the selected range"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
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
                  {tickValue}ms
                </text>
              )}
            </g>
          );
        })}

        <g className={waitColor}>
          <LinePath
            data={points}
            defined={(point) => point.wait_p95 !== null}
            x={(_, index) => xScale(index)}
            y={(point) => yScale(point.wait_p95 ?? 0)}
            curve={curveMonotoneX}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g className={runColor}>
          <LinePath
            data={points}
            defined={(point) => point.run_p95 !== null}
            x={(_, index) => xScale(index)}
            y={(point) => yScale(point.run_p95 ?? 0)}
            curve={curveMonotoneX}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {hoverIndex !== null && (
          <line
            x1={xScale(hoverIndex)}
            x2={xScale(hoverIndex)}
            y1={margin.top}
            y2={margin.top + innerHeight}
            stroke="rgb(var(--content-muted))"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
          />
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
            <span className="size-2 rounded-full bg-candy-blue" />
            <span className="font-mono font-medium text-content-emphasis">
              {hoverPoint.wait_p95 === null ? '—' : `${hoverPoint.wait_p95}ms`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-candy-yellow" />
            <span className="font-mono font-medium text-content-emphasis">
              {hoverPoint.run_p95 === null ? '—' : `${hoverPoint.run_p95}ms`}
            </span>
          </div>
          <div className="mt-0.5 text-content-subtle">
            {format(hoverPoint.bucket_ts, 'MMM d HH:mm')}
          </div>
        </div>
      )}
    </div>
  );
}
