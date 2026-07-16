import { EmptyState, StatusBadge } from '@superbull/ui';
import { Cable } from 'lucide-react';
import type { Connector } from '../../../../../lib/connectors/types';
import { RemoveConnectorButton } from './remove-connector-button';

export interface ConnectorRow {
  connector: Connector;
  status: 'online' | 'offline' | 'pending' | 'unknown';
  queueCount: number | null;
  liveStatusAvailable: boolean;
}

interface ConnectorsTableProps {
  workspaceSlug: string;
  rows: ConnectorRow[];
}

export function ConnectorsTable(props: ConnectorsTableProps) {
  const { workspaceSlug, rows } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-2sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="w-28 px-4 py-2.5 font-medium">Status</th>
              <th className="w-24 px-4 py-2.5 text-right font-medium">Queues</th>
              <th className="w-28 px-4 py-2.5 font-medium">Version</th>
              <th className="w-32 px-4 py-2.5 font-medium">Added</th>
              <th className="w-16 px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={Cable}
                    title="No connectors yet"
                    description="Create one and run the enrollment command next to your Redis."
                  />
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.connector.id}
                data-testid="connector-row"
                className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
              >
                <td className="whitespace-nowrap px-5 py-3">
                  <a
                    href={`/app/${workspaceSlug}/connectors/${row.connector.id}/`}
                    className="font-medium text-content-emphasis hover:underline"
                  >
                    {row.connector.name}
                  </a>
                </td>
                <td className="px-4 py-3" data-testid="connector-health">
                  <StatusBadge variant={statusVariant(row.status)}>{row.status}</StatusBadge>
                </td>
                <td
                  className="px-4 py-3 text-right font-mono tabular-nums text-content-default"
                  data-testid="connector-queue-count"
                >
                  {row.queueCount ?? '-'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-content-subtle">
                  {row.connector.version ?? '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-content-subtle">
                  {row.connector.created_at.toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <RemoveConnectorButton
                    workspaceSlug={workspaceSlug}
                    connectorId={row.connector.id}
                    connectorName={row.connector.name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusVariant(
  status: ConnectorRow['status'],
): 'success' | 'error' | 'pending' | 'neutral' {
  if (status === 'online') {
    return 'success';
  }
  if (status === 'offline') {
    return 'error';
  }
  if (status === 'pending') {
    return 'pending';
  }
  return 'neutral';
}
