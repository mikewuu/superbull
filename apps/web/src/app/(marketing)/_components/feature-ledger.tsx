import Image from 'next/image';

const items = [
  {
    n: '01',
    title: 'Timeline waterfall',
    body: 'Wait time sits next to run time, so you see where the 4 seconds actually went.',
  },
  {
    n: '02',
    title: 'Every attempt keeps its history',
    body: 'Logs, data, options, and the return value — for each attempt, not just the last one.',
  },
  {
    n: '03',
    title: 'Replay with an editable payload',
    body: 'Open the same job, change the input, run it again. No re-triggering blind.',
  },
];

export function FeatureLedger(): React.ReactElement {
  return (
    <div>
      <h3 className="text-3xl font-semibold tracking-tight text-content-emphasis">
        The whole story for one job.
      </h3>
      <div className="mt-8 divide-y divide-border-subtle border-y border-border-subtle">
        {items.map((item) => (
          <div key={item.n} className="flex gap-6 py-6">
            <span className="font-mono text-2sm text-content-muted">{item.n}</span>
            <div>
              <p className="font-semibold text-content-emphasis">{item.title}</p>
              <p className="mt-1.5 text-2sm leading-6 text-content-default">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border border-border-subtle shadow-sm">
        <Image
          src="/landing/screenshots/job-detail.webp"
          alt="SuperBull job detail page: timeline waterfall next to created, started, and finished timestamps"
          width={2000}
          height={481}
          className="w-full"
        />
      </div>
    </div>
  );
}
