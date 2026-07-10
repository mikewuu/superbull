import { StatusBadge } from '@superbull/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOverallStatus } from '../../../lib/status-pages/get-overall-status';
import { getPublicStatusPage } from '../../../lib/status-pages/get-public-status-page';
import { getPublicStatusPageUptime } from '../../../lib/status-pages/get-public-status-page-uptime';
import type { PublicStatusPageQueueUptime } from '../../../lib/status-pages/types';
import { UptimeBarStrip } from './_components/uptime-bar-strip';

export const revalidate = 60;

interface StatusPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: StatusPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getPublicStatusPage({ slug });
  if (!page) {
    return { robots: { index: false, follow: false } };
  }
  return {
    title: `${page.title} — Status`,
    robots: { index: false, follow: false },
  };
}

export default async function StatusPage(props: StatusPageProps) {
  const { slug } = await props.params;
  const fetchedAt = Date.now();
  const [page, uptime] = await Promise.all([
    getPublicStatusPage({ slug }),
    getPublicStatusPageUptime({ slug }),
  ]);

  if (!page || !uptime) {
    notFound();
  }

  const overallStatus = getOverallStatus(uptime.overall.at(-1)?.rate ?? null);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex items-center gap-3">
        {page.logo_url ? (
          <img src={page.logo_url} alt="" className="h-10 w-auto" />
        ) : (
          <img src="/logo-mark.webp" alt="" className="h-10 w-auto" />
        )}
        <h1 className="text-xl font-semibold text-content-emphasis">{page.title}</h1>
      </div>

      <div className="mt-4">
        <OverallStatusBadge status={overallStatus} />
      </div>

      <div className="mt-8">
        <UptimeBarStrip days={uptime.overall} />
        <div className="mt-2 flex items-center justify-between text-sm text-content-subtle">
          <span>90 days</span>
          <span>{formatRate(uptime.overall_rate_90d)}</span>
        </div>
      </div>

      {uptime.queues.length > 1 && (
        <div className="mt-10 flex flex-col gap-8">
          {uptime.queues.map((queue) => (
            <QueueUptimeSection key={queue.name} queue={queue} />
          ))}
        </div>
      )}

      <p className="mt-12 text-xs text-content-muted">
        Updated {formatUpdatedAt(fetchedAt)} · Powered by SuperBull
      </p>
    </div>
  );
}

function OverallStatusBadge(props: { status: 'operational' | 'degraded' | 'issues' }) {
  const { status } = props;

  if (status === 'operational') {
    return <StatusBadge variant="success">All systems operational</StatusBadge>;
  }
  if (status === 'degraded') {
    return <StatusBadge variant="warning">Degraded</StatusBadge>;
  }
  return <StatusBadge variant="error">Issues</StatusBadge>;
}

function QueueUptimeSection(props: { queue: PublicStatusPageQueueUptime }) {
  const { queue } = props;

  return (
    <div>
      <h2 className="text-sm font-medium text-content-emphasis">{queue.name}</h2>
      <div className="mt-2">
        <UptimeBarStrip days={queue.days} />
      </div>
      <div className="mt-2 flex items-center justify-end text-sm text-content-subtle">
        <span>{formatRate(queue.rate_90d)}</span>
      </div>
    </div>
  );
}

function formatRate(rate: number | null): string {
  if (rate === null) {
    return 'No data yet';
  }
  return `${(rate * 100).toFixed(2)}%`;
}

function formatUpdatedAt(fetchedAtMs: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - fetchedAtMs) / 60_000));
  if (minutes < 1) {
    return 'just now';
  }
  return `${minutes}m ago`;
}
