import { PageHeader } from '@superbull/ui';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import type { Connector } from '../../../../lib/connectors/types';
import { getGatewayConfig } from '../../../../lib/gateway/gateway-config';
import { getConnectorStatusFromGateway } from '../../../../lib/gateway/get-connector-status';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';
import { type ConnectorRow, ConnectorsTable } from './_components/connectors-table';
import { NewConnectorDialog } from './_components/new-connector-dialog';

export const dynamic = 'force-dynamic';

const DEFAULT_GATEWAY_WS_URL = 'wss://connect.superbull.com';

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
        controls={
          <NewConnectorDialog workspaceSlug={workspaceSlug} gatewayWsUrl={getGatewayWsUrl()} />
        }
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

// Live state comes from the gateway's session registry. When the gateway is
// unreachable we fall back to the lastConnectedAt/lastDisconnectedAt stamps
// it writes through Convex (markConnected/markDisconnected). A connector
// that has never connected shows "pending" — it exists but its process
// hasn't dialed in yet.
async function getConnectorStatus(
  connector: Connector,
): Promise<{ status: 'online' | 'offline' | 'pending'; queueCount: number | null }> {
  const live = await getConnectorStatusFromGateway(connector.id);
  if (live?.connected) {
    return { status: 'online', queueCount: live.queues.length };
  }

  const storedQueueCount = connector.queues?.length ?? null;
  if (connector.lastConnectedAt === null) {
    return { status: 'pending', queueCount: storedQueueCount };
  }
  if (live) {
    return { status: 'offline', queueCount: storedQueueCount };
  }
  const online =
    connector.lastDisconnectedAt === null ||
    connector.lastDisconnectedAt < connector.lastConnectedAt;
  return { status: online ? 'online' : 'offline', queueCount: storedQueueCount };
}

// The enrollment command needs the connector-facing WebSocket endpoint. In
// production that's the published connect domain; in dev, derive it from
// GATEWAY_URL (http://localhost:4650 -> ws://localhost:4650).
function getGatewayWsUrl(): string {
  const gateway = getGatewayConfig();
  if (!gateway) {
    return DEFAULT_GATEWAY_WS_URL;
  }
  return gateway.url.replace(/^http/, 'ws');
}
