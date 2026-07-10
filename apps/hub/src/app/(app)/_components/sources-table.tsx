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
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">URL</th>
            <th className="px-4 py-3">Health</th>
            <th className="px-4 py-3">Queues</th>
            <th className="px-4 py-3">Added</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                No sources yet.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.source.id}
              data-testid="source-row"
              className="border-b border-neutral-100 last:border-0"
            >
              <td className="px-4 py-3 font-medium">
                <a href={`/s/${row.source.id}/`} className="text-blue-600 hover:underline">
                  {row.source.name}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-500">{row.source.url}</td>
              <td className="px-4 py-3" data-testid="source-health">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${row.online ? 'bg-green-600' : 'bg-red-600'}`}
                  />
                  {row.online ? 'online' : 'offline'}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs" data-testid="source-queue-count">
                {row.queueCount ?? '—'}
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {row.source.created_at.toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <RemoveSourceButton sourceId={row.source.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
