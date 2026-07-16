import { type ConnectorStatus, connectorStatusSchema } from '@superbull/protocol';
import { getGatewayConfig } from './gateway-config';

// Live connection state from the gateway's session registry:
// GET ${GATEWAY_URL}/internal/connectors/:connectorId/status. Returns null
// when the gateway is unconfigured/unreachable so callers can fall back to
// the lastConnectedAt/lastDisconnectedAt stamps Convex keeps.
export async function getConnectorStatusFromGateway(
  connectorId: string,
): Promise<ConnectorStatus | null> {
  const gateway = getGatewayConfig();
  if (!gateway) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(
      `${gateway.url}/internal/connectors/${encodeURIComponent(connectorId)}/status`,
      {
        headers: { authorization: `Bearer ${gateway.internalToken}` },
        signal: AbortSignal.timeout(2_000),
        cache: 'no-store',
      },
    );
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return null;
  }
  const parsed = connectorStatusSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
