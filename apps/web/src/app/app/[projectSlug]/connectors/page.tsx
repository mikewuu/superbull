import { PageHeader } from '@superbull/ui';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import type { Connector } from '../../../../lib/connectors/types';
import { getGatewayConfig } from '../../../../lib/gateway/gateway-config';
import { getConnectorStatusFromGateway } from '../../../../lib/gateway/get-connector-status';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';
import { type ConnectorRow, ConnectorsTable } from './_components/connectors-table';
import { NewConnectorDialog } from './_components/new-connector-dialog';

export const dynamic = 'force-dynamic';

const DEFAULT_GATEWAY_WS_URL = 'wss://connect.superbull.com';

interface ConnectorsPageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function ConnectorsPage(props: ConnectorsPageProps) {
  const { projectSlug } = await props.params;
  const { project } = await requireProjectForSlug(projectSlug);
  const connectors = await listConnectors(project._id);
  const rows = await getConnectorRows(connectors);
  const gatewayUnreachable = rows.some((row) => !row.liveStatusAvailable);

  return (
    <>
      <PageHeader
        title="Connectors"
        subtitle="Processes reporting queue activity into this project."
        controls={<NewConnectorDialog projectSlug={projectSlug} gatewayWsUrl={getGatewayWsUrl()} />}
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {gatewayUnreachable && (
          <p
            data-testid="gateway-unreachable-notice"
            className="rounded-lg border border-border-subtle bg-bg-warning px-4 py-2.5 text-2sm text-content-warning"
          >
            Cannot reach the gateway right now, so connector statuses may be stale.
          </p>
        )}
        <ConnectorsTable projectSlug={projectSlug} rows={rows} />
      </div>
    </>
  );
}

async function getConnectorRows(connectors: Connector[]): Promise<ConnectorRow[]> {
  return await Promise.all(
    connectors.map(async (connector) => ({ connector, ...(await getConnectorStatus(connector)) })),
  );
}

// Live state comes from the gateway's session registry. A connector that has
// never connected shows "pending" (it exists but its process hasn't dialed
// in yet). When the gateway is unreachable, the Convex stamps cannot prove
// liveness (a dead gateway never runs markDisconnected), so anything with a
// connection history shows "unknown" rather than a stale "online".
async function getConnectorStatus(connector: Connector): Promise<{
  status: 'online' | 'offline' | 'pending' | 'unknown';
  queueCount: number | null;
  liveStatusAvailable: boolean;
}> {
  const live = await getConnectorStatusFromGateway(connector.id);
  if (live?.connected) {
    return { status: 'online', queueCount: live.queues.length, liveStatusAvailable: true };
  }

  const storedQueueCount = connector.queues?.length ?? null;
  if (connector.lastConnectedAt === null) {
    return { status: 'pending', queueCount: storedQueueCount, liveStatusAvailable: live !== null };
  }
  if (live) {
    return { status: 'offline', queueCount: storedQueueCount, liveStatusAvailable: true };
  }
  return { status: 'unknown', queueCount: storedQueueCount, liveStatusAvailable: false };
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
