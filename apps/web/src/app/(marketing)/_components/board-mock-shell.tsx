import Image from 'next/image';
import { cn } from '../../../lib/cn';

const queues = [
  { name: 'send-emails', count: 9, active: true },
  { name: 'process-videos', count: 0, active: false },
  { name: 'sync-contacts', count: 0, active: false },
];

const stats = [
  { label: 'Jobs per minute', value: '0', dotColor: 'bg-candy-blue' },
  { label: 'Jobs past hour', value: '24', dotColor: 'bg-candy-blue' },
  { label: 'Failed past 24h', value: '0', dotColor: 'bg-candy-green' },
  { label: 'Workers', value: '3', dotColor: 'bg-candy-green' },
];

const throughputMinutes = [
  { minutesAgo: 55, jobs: 4 },
  { minutesAgo: 50, jobs: 6 },
  { minutesAgo: 45, jobs: 3 },
  { minutesAgo: 40, jobs: 8 },
  { minutesAgo: 35, jobs: 14 },
  { minutesAgo: 30, jobs: 22 },
  { minutesAgo: 25, jobs: 24 },
  { minutesAgo: 20, jobs: 18 },
  { minutesAgo: 15, jobs: 10 },
  { minutesAgo: 10, jobs: 5 },
  { minutesAgo: 5, jobs: 3 },
  { minutesAgo: 0, jobs: 2 },
];

const workload = [
  { queue: 'send-emails', waiting: 5, failed: 0, workers: 3 },
  { queue: 'process-videos', waiting: 0, failed: 0, workers: 0 },
  { queue: 'sync-contacts', waiting: 0, failed: 0, workers: 0, paused: true },
];

export function BoardMockShell(): React.ReactElement {
  return (
    <div className="flex h-[520px] text-content-default sm:h-[560px]">
      <aside className="hidden w-48 shrink-0 flex-col border-r border-border-subtle bg-bg-muted p-4 sm:flex">
        <div className="flex items-center gap-2 text-2sm font-semibold text-content-emphasis">
          <Image
            src="/landing/logos/logo-mark.webp"
            alt=""
            width={44}
            height={22}
            className="h-5 w-auto"
          />
          SuperBull
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.12em] text-content-muted uppercase">
          Main
        </p>
        <div className="mt-2 rounded-lg bg-bg-default px-3 py-2 text-2sm font-medium text-content-emphasis ring-1 ring-border-subtle">
          Overview
        </div>
        <p className="mt-5 text-xs font-semibold tracking-[0.12em] text-content-muted uppercase">
          Queues
        </p>
        <div className="mt-2 flex flex-col gap-1">
          {queues.map((queue) => (
            <div
              key={queue.name}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-1.5 text-2sm',
                queue.active ? 'font-medium text-content-emphasis' : 'text-content-subtle',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', {
                    'bg-candy-blue': queue.active,
                    'bg-border-default': !queue.active,
                  })}
                />
                {queue.name}
              </span>
              <span className="rounded bg-bg-subtle px-1.5 text-xs text-content-muted">
                {queue.count}
              </span>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 overflow-hidden p-5 sm:p-6">
        <p className="text-lg font-semibold text-content-emphasis">Overview</p>
        <p className="mt-0.5 text-2sm text-content-subtle">
          Real-time activity across your queues.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border-subtle bg-bg-default p-3.5"
            >
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full', stat.dotColor)} />
              <p className="mt-2 text-2sm text-content-subtle">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-content-emphasis">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border-subtle bg-bg-default p-4">
          <div className="flex items-center justify-between text-2sm">
            <span className="font-semibold text-content-emphasis">Throughput</span>
            <span className="font-mono text-xs text-content-muted">59m ago — now</span>
          </div>
          <div className="mt-4 flex h-20 items-end gap-1.5">
            {throughputMinutes.map((minute) => (
              <span
                key={minute.minutesAgo}
                style={{ height: `${minute.jobs * 3.6}px` }}
                className="flex-1 rounded-t bg-candy-green/25"
              />
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border-subtle bg-bg-default">
          <div className="grid grid-cols-4 gap-2 border-b border-border-subtle px-4 py-2 text-xs text-content-muted">
            <span>Queue</span>
            <span>Waiting</span>
            <span>Failed</span>
            <span>Workers</span>
          </div>
          {workload.map((row) => (
            <div
              key={row.queue}
              className="grid grid-cols-4 gap-2 border-b border-border-subtle px-4 py-2.5 text-2sm last:border-b-0"
            >
              <span className="flex items-center gap-2 font-medium text-content-emphasis">
                {row.queue}
                {row.paused ? (
                  <span className="rounded bg-bg-subtle px-1.5 text-xs text-content-muted">
                    paused
                  </span>
                ) : null}
              </span>
              <span>{row.waiting}</span>
              <span>{row.failed}</span>
              <span>{row.workers}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
