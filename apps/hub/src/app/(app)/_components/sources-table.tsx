import type { ProxySource } from '../../../lib/sources/types';
import { RemoveSourceButton } from './remove-source-button';

export interface SourceRow {
  source: ProxySource;
  online: boolean;
  queueCount: number | null;
}

interface SourcesTableProps {
  rows: SourceRow[];
}

export function SourcesTable(props: SourcesTableProps) {
  const { rows } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">URL</th>
            <th className="w-24 px-4 py-2.5 font-medium">Health</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium">Queues</th>
            <th className="w-32 px-4 py-2.5 font-medium">Added</th>
            <th className="w-16 px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-6 text-center text-content-muted">
                No sources yet.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.source.id}
              data-testid="source-row"
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3">
                <a
                  href={`/s/${row.source.id}/`}
                  className="font-medium text-content-emphasis hover:underline"
                >
                  {row.source.name}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-content-subtle">{row.source.url}</td>
              <td className="px-4 py-3" data-testid="source-health">
                <span className="inline-flex items-center gap-1.5 text-content-default">
                  <span
                    className={`size-1.5 rounded-full ${row.online ? 'bg-candy-green' : 'bg-red-500'}`}
                  />
                  {row.online ? 'online' : 'offline'}
                </span>
              </td>
              <td
                className="px-4 py-3 text-right font-mono tabular-nums text-content-default"
                data-testid="source-queue-count"
              >
                {row.queueCount ?? '—'}
              </td>
              <td className="px-4 py-3 text-content-subtle">
                {row.source.created_at.toLocaleDateString()}
              </td>
              <td className="px-5 py-3 text-right">
                <RemoveSourceButton sourceId={row.source.id} sourceName={row.source.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
