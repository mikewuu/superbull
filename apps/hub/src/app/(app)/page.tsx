import { PageHeader } from '@bullwatch/ui';
import { listSources } from '../../lib/sources/list-sources';
import type { ProxySource } from '../../lib/sources/types';
import { AddSourceForm } from './_components/add-source-form';
import { type SourceRow, SourcesTable } from './_components/sources-table';

export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const sources = await listSources();
  const rows = await getSourceRows(sources);

  return (
    <>
      <PageHeader title="Sources" subtitle="Remote bullwatch proxies this hub federates." />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
          <SourcesTable rows={rows} />
          <AddSourceForm />
        </div>
      </div>
    </>
  );
}

async function getSourceRows(sources: ProxySource[]): Promise<SourceRow[]> {
  const [healthResults, queueResults] = await Promise.all([
    Promise.allSettled(sources.map((source) => checkSourceOnline(source.url))),
    Promise.allSettled(sources.map((source) => getSourceQueueCount(source))),
  ]);

  return sources.map((source, index) => ({
    source,
    online: settledValue(healthResults[index], false),
    queueCount: settledValue(queueResults[index], null),
  }));
}

function settledValue<T>(result: PromiseSettledResult<T> | undefined, fallback: T): T {
  return result?.status === 'fulfilled' ? result.value : fallback;
}

async function checkSourceOnline(url: string): Promise<boolean> {
  const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(2000) });
  return response.ok;
}

async function getSourceQueueCount(source: ProxySource): Promise<number | null> {
  const response = await fetch(`${source.url}/api/queues`, {
    headers: { authorization: `Bearer ${source.token}` },
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { queues: unknown[] };
  return body.queues.length;
}
