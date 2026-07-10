import { cn } from '@superbull/ui';

interface TimelineWaterfallProps {
  timestamp: number;
  processedOn?: number | null;
  finishedOn?: number | null;
  failed: boolean;
}

export function TimelineWaterfall(props: TimelineWaterfallProps) {
  const { timestamp, processedOn, finishedOn, failed } = props;
  const now = Date.now();
  const totalMsRaw = (finishedOn ?? now) - timestamp;
  const totalMs = totalMsRaw < 1 ? 1 : totalMsRaw;
  const waitMs = processedOn ? processedOn - timestamp : null;
  const runMs = processedOn ? (finishedOn ?? now) - processedOn : null;
  const waitPct = waitMs !== null ? Math.min(100, Math.max(0, (waitMs / totalMs) * 100)) : 0;
  const active = !!processedOn && !finishedOn;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
        <span className="text-2sm font-medium text-content-emphasis">Timeline</span>
        <span className="font-mono text-2sm text-content-muted">
          {formatDuration(totalMs)} total
        </span>
      </div>
      <TimeRuler totalMs={totalMs} />
      <div className="grid grid-cols-[11rem_1fr] items-center gap-2 border-b border-border-subtle px-4 py-2">
        <span className="text-2sm text-content-subtle">Waiting</span>
        <WaterfallBar
          leftPct={0}
          widthPct={waitPct}
          durationMs={waitMs}
          barClassName="bg-bg-emphasis"
          textClassName="text-content-emphasis"
        />
      </div>
      {processedOn && (
        <div className="grid grid-cols-[11rem_1fr] items-center gap-2 border-b border-border-subtle px-4 py-2 last:border-0">
          <span className="text-2sm text-content-subtle">Running</span>
          <WaterfallBar
            leftPct={waitPct}
            widthPct={100 - waitPct}
            durationMs={runMs}
            barClassName={failed ? 'bg-[#e5484d]' : 'bg-candy-green'}
            textClassName="text-white"
            pulse={active}
          />
        </div>
      )}
    </div>
  );
}

function TimeRuler(props: { totalMs: number }) {
  const { totalMs } = props;
  const fractions = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative h-8 border-b border-border-subtle px-4">
      {fractions.map((fraction) => (
        <span
          key={fraction}
          className="absolute inset-y-0 w-px bg-border-subtle"
          style={{ left: `${fraction * 100}%` }}
        />
      ))}
      {fractions.map((fraction) => (
        <span
          key={fraction}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] text-content-muted',
            { 'right-4': fraction === 1 },
          )}
          style={fraction === 1 ? undefined : { left: `calc(${fraction * 100}% + 4px)` }}
        >
          {formatDuration(Math.round(totalMs * fraction))}
        </span>
      ))}
    </div>
  );
}

interface WaterfallBarProps {
  leftPct: number;
  widthPct: number;
  durationMs: number | null;
  barClassName: string;
  textClassName: string;
  pulse?: boolean;
}

function WaterfallBar(props: WaterfallBarProps) {
  const { leftPct, widthPct, durationMs, barClassName, textClassName, pulse } = props;
  const showInside = widthPct > 12;

  return (
    <div className="relative h-5">
      <div
        className={cn(
          'absolute inset-y-0 flex items-center overflow-hidden rounded-[3px] px-1',
          barClassName,
          {
            'animate-pulse': pulse,
          },
        )}
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      >
        {durationMs !== null && showInside && (
          <span className={cn('truncate font-mono text-[10px]', textClassName)}>
            {formatDuration(durationMs)}
          </span>
        )}
      </div>
      {durationMs !== null && !showInside && (
        <span
          className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] text-content-muted"
          style={{ left: `calc(${leftPct + widthPct}% + 4px)` }}
        >
          {formatDuration(durationMs)}
        </span>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
