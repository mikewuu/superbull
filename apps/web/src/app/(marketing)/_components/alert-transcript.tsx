const lines = [
  {
    time: '03:14:02',
    queue: 'send-emails',
    text: '12 failed in the last hour. Retry rate 38%.',
  },
  {
    time: '03:14:02',
    queue: 'process-videos',
    text: 'paused for 6 hours. Nobody resumed it.',
  },
  {
    time: '03:14:03',
    queue: 'sync-contacts',
    text: 'p95 duration went from 400ms to 4.1s after last night’s deploy.',
  },
];

export function AlertTranscript(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-2 font-mono text-xs text-white/40">superbull-alerts.log</span>
      </div>
      <div className="p-5 font-mono text-[12.5px] leading-relaxed sm:p-6">
        <p className="text-white/40">$ tail -f superbull-alerts.log</p>
        <div className="mt-3 space-y-2.5">
          {lines.map((line) => (
            <p key={line.queue} className="text-white/85">
              <span className="text-white/35">[{line.time}]</span>{' '}
              <span className="text-candy-orange">ALERT</span>{' '}
              <span className="text-white">{line.queue}</span>{' '}
              <span className="text-white/70">{line.text}</span>
            </p>
          ))}
        </div>
        <p className="mt-4 text-white/40">
          $ mail -s &quot;SuperBull daily digest&quot; you@example.com
          <span
            aria-hidden="true"
            className="cursor-blink ml-1 inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] bg-white/90 align-baseline"
          />
        </p>
      </div>
    </div>
  );
}
