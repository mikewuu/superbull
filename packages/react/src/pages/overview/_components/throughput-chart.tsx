import { cn } from '@bullwatch/ui';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useState } from 'react';

interface ThroughputChartProps {
  completedBuckets: number[];
  failedBuckets: number[];
  deltaPercent: number | null;
}

const completedColor = 'text-candy-green';
const failedColor = 'text-[#e5484d]';

export function ThroughputChart(props: ThroughputChartProps) {
  const { completedBuckets, failedBuckets, deltaPercent } = props;
  const completed = completedBuckets.slice(0, 60).reverse();
  const failed = failedBuckets.slice(0, 60).reverse();
  const total = sum(completed) + sum(failed);
  const isEmpty = total === 0;

  return (
    <div className="candy-card flex flex-col gap-4 rounded-lg px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-2sm font-medium text-content-emphasis">Throughput</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[26px] font-semibold tracking-tight tabular-nums text-content-emphasis">
              {total.toLocaleString()}
            </span>
            <span className="text-xs text-content-subtle">jobs past hour</span>
            {deltaPercent !== null && (
              <span
                className={cn('text-xs font-medium tabular-nums', {
                  'text-content-success': deltaPercent >= 0,
                  'text-content-error': deltaPercent < 0,
                })}
              >
                {deltaPercent >= 0 ? '+' : ''}
                {deltaPercent}% vs prev hour
              </span>
            )}
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
            No activity in the last hour.
          </div>
        ) : (
          <ParentSize>
            {({ width, height }) => (
              <ThroughputPlot width={width} height={height} completed={completed} failed={failed} />
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

function ThroughputPlot(props: {
  width: number;
  height: number;
  completed: number[];
  failed: number[];
}) {
  const { width, height, completed, failed } = props;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const pointCount = Math.max(completed.length, failed.length);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...completed, ...failed, 1);

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

  const hoverCompleted = hoverIndex === null ? null : (completed[hoverIndex] ?? 0);
  const hoverFailed = hoverIndex === null ? null : (failed[hoverIndex] ?? 0);
  const minutesAgo = hoverIndex === null ? null : pointCount - 1 - hoverIndex;

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Completed and failed jobs over the last hour"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <LinearGradient
          id="throughput-completed"
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
            data={completed}
            x={(_, index) => xScale(index)}
            y={(value) => yScale(value)}
            yScale={yScale}
            curve={curveMonotoneX}
            fill="url(#throughput-completed)"
          />
          <LinePath
            data={completed}
            x={(_, index) => xScale(index)}
            y={(value) => yScale(value)}
            curve={curveMonotoneX}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g className={failedColor}>
          <LinePath
            data={failed}
            x={(_, index) => xScale(index)}
            y={(value) => yScale(value)}
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
            {hoverCompleted !== null && (
              <circle
                cx={xScale(hoverIndex)}
                cy={yScale(hoverCompleted)}
                r={3.5}
                className={completedColor}
                fill="currentColor"
                stroke="#fff"
                strokeWidth={1.5}
              />
            )}
            {hoverFailed !== null && (
              <circle
                cx={xScale(hoverIndex)}
                cy={yScale(hoverFailed)}
                r={3.5}
                className={failedColor}
                fill="currentColor"
                stroke="#fff"
                strokeWidth={1.5}
              />
            )}
          </g>
        )}

        <text x={margin.left} y={height - 4} className="fill-content-muted font-mono text-[10px]">
          {pointCount - 1}m ago
        </text>
        <text
          x={margin.left + innerWidth}
          y={height - 4}
          textAnchor="end"
          className="fill-content-muted font-mono text-[10px]"
        >
          now
        </text>
      </svg>

      {hoverIndex !== null && minutesAgo !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-subtle bg-white px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: xScale(hoverIndex) }}
        >
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-candy-green" />
            <span className="font-mono font-medium text-content-emphasis">{hoverCompleted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#e5484d]" />
            <span className="font-mono font-medium text-content-emphasis">{hoverFailed}</span>
          </div>
          <div className="mt-0.5 text-content-subtle">
            {minutesAgo === 0 ? 'now' : `${minutesAgo}m ago`}
          </div>
        </div>
      )}
    </div>
  );
}
