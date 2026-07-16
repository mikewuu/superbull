import { PageHeader } from '@superbull/ui';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import type { Connector } from '../../../../lib/connectors/types';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';
import { type ConnectorRow, ConnectorsTable } from './_components/connectors-table';
import { NewConnectorDialog } from './_components/new-connector-dialog';

export const dynamic = 'force-dynamic';

interface ConnectorsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function ConnectorsPage(props: ConnectorsPageProps) {
  const { workspaceSlug } = await props.params;
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const connectors = await listConnectors(workspace._id);
  const rows = await getConnectorRows(connectors);

  return (
    <>
      <PageHeader
        title="Connectors"
        subtitle="Processes reporting queue activity into this workspace."
        controls={<NewConnectorDialog workspaceSlug={workspaceSlug} />}
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <ConnectorsTable workspaceSlug={workspaceSlug} rows={rows} />
      </div>
    </>
  );
}

async function getConnectorRows(connectors: Connector[]): Promise<ConnectorRow[]> {
  return await Promise.all(
    connectors.map(async (connector) => ({ connector, ...(await getConnectorStatus(connector)) })),
  );
}

// Gateway-enrolled connectors (no legacy `url`) report their own
// connected/disconnected state via lastConnectedAt/lastDisconnectedAt
// (convex/connectors.ts's markConnected/markDisconnected, wired to the
// gateway in Round 3). Legacy connectors created through the old HTTP proxy
// flow have neither field set yet, so they fall back to a naive HTTP health
// check against their stored url — connectors with no url at all (never
// connected, gateway path not live yet) render as "pending".
async function getConnectorStatus(
  connector: Connector,
): Promise<{ status: 'online' | 'offline' | 'pending'; queueCount: number | null }> {
  if (connector.lastConnectedAt !== null) {
    const online =
      connector.lastDisconnectedAt === null ||
      connector.lastDisconnectedAt < connector.lastConnectedAt;
    return { status: online ? 'online' : 'offline', queueCount: connector.queues?.length ?? null };
  }

  if (connector.url) {
    const [health, queueCount] = await Promise.allSettled([
      checkConnectorOnline(connector.url),
      getConnectorQueueCount(connector),
    ]);
    return {
      status: health.status === 'fulfilled' && health.value ? 'online' : 'offline',
      queueCount: queueCount.status === 'fulfilled' ? queueCount.value : null,
    };
  }

  return { status: 'pending', queueCount: null };
}

async function checkConnectorOnline(url: string): Promise<boolean> {
  const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(2000) });
  return response.ok;
}

async function getConnectorQueueCount(connector: Connector): Promise<number | null> {
  if (!connector.url || !connector.token) {
    return null;
  }
  const response = await fetch(`${connector.url}/api/queues`, {
    headers: { authorization: `Bearer ${connector.token}` },
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { queues: unknown[] };
  return body.queues.length;
}
