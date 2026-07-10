import { format } from 'date-fns';
import { cn } from '../../../lib/cn';

interface TimingSidebarProps {
  timestamp: number;
  processedOn?: number | null;
  finishedOn?: number | null;
  failed: boolean;
}

export function TimingSidebar(props: TimingSidebarProps) {
  const { timestamp, processedOn, finishedOn, failed } = props;
  const waitMs = processedOn ? processedOn - timestamp : null;
  const runMs = processedOn ? (finishedOn ?? Date.now()) - processedOn : null;
  const active = !!processedOn && !finishedOn;

  return (
    <div className="px-4 py-3">
      <TimingEntryRow label="Created" ts={timestamp} />
      <TimingGapRow durationMs={waitMs} label="wait" />
      <TimingEntryRow label="Started" ts={processedOn} />
      <TimingGapRow
        durationMs={runMs}
        label="run"
        thick={!!processedOn}
        colorClassName={failed ? 'bg-[#e5484d]' : 'bg-candy-green'}
        pulse={active}
      />
      <TimingEntryRow label="Finished" ts={finishedOn} />
    </div>
  );
}

function TimingEntryRow(props: { label: string; ts?: number | null }) {
  const { label, ts } = props;

  return (
    <div className="grid grid-cols-[1rem_1fr] items-center gap-2">
      <div className="flex w-4 justify-center">
        <span
          className={cn('size-[7px] rounded-full border border-border-default bg-white', {
            'opacity-40': !ts,
          })}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2sm font-medium text-content-emphasis">{label}</span>
        <span className="font-mono text-xs text-content-subtle">
          {ts ? format(ts, 'MMM d, HH:mm:ss.SSS') : '—'}
        </span>
      </div>
    </div>
  );
}

function TimingGapRow(props: {
  durationMs: number | null;
  label: string;
  thick?: boolean;
  colorClassName?: string;
  pulse?: boolean;
}) {
  const { durationMs, label, thick, colorClassName, pulse } = props;

  return (
    <div className="grid h-8 grid-cols-[1rem_1fr] items-center gap-2">
      <div className="flex h-full w-4 justify-center">
        <span
          className={cn(
            'h-full rounded-full',
            thick ? cn('w-[7px]', colorClassName) : 'w-px bg-border-default',
            { 'animate-pulse': pulse },
          )}
        />
      </div>
      <div>
        {durationMs !== null && (
          <span className="font-mono text-xs text-content-muted">
            {label} {formatDuration(durationMs)}
          </span>
        )}
      </div>
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
