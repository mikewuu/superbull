import type { Connector } from '../../../../../lib/connectors/types';
import { RemoveConnectorButton } from './remove-connector-button';

export interface ConnectorRow {
  connector: Connector;
  status: 'online' | 'offline' | 'pending';
  queueCount: number | null;
}

interface ConnectorsTableProps {
  workspaceSlug: string;
  rows: ConnectorRow[];
}

export function ConnectorsTable(props: ConnectorsTableProps) {
  const { workspaceSlug, rows } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
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
              <td colSpan={6} className="px-5 py-6 text-center text-content-muted">
                No connectors yet. Create one and run the enrollment command next to your Redis.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.connector.id}
              data-testid="connector-row"
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3">
                <a
                  href={`/app/${workspaceSlug}/connectors/${row.connector.id}/`}
                  className="font-medium text-content-emphasis hover:underline"
                >
                  {row.connector.name}
                </a>
              </td>
              <td className="px-4 py-3" data-testid="connector-health">
                <span className="inline-flex items-center gap-1.5 text-content-default">
                  <span className={`size-1.5 rounded-full ${dotColor(row.status)}`} />
                  {row.status}
                </span>
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
              <td className="px-4 py-3 text-content-subtle">
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
  );
}

function dotColor(status: ConnectorRow['status']): string {
  if (status === 'online') {
    return 'bg-candy-green';
  }
  if (status === 'pending') {
    return 'bg-amber-400';
  }
  return 'bg-red-500';
}
