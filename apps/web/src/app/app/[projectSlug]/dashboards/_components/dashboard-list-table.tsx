import Link from 'next/link';
import type { SavedDashboard } from '../../../../../lib/dashboards/types';

interface DashboardListTableProps {
  projectSlug: string;
  dashboards: SavedDashboard[];
}

export function DashboardListTable(props: DashboardListTableProps) {
  const { projectSlug, dashboards } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Name</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium">Cards</th>
            <th className="w-32 px-5 py-2.5 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {dashboards.map((dashboard) => (
            <tr
              key={dashboard.id}
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3">
                <Link
                  href={`/app/${projectSlug}/dashboards/${dashboard.id}`}
                  className="font-medium text-content-emphasis hover:underline"
                >
                  {dashboard.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-content-default">
                {dashboard.cards.length}
              </td>
              <td className="px-5 py-3 text-content-subtle">
                {dashboard.created_at.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
