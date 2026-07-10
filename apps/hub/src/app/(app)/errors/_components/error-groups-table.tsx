import { StatusBadge } from '@superbull/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import type { ErrorGroup } from '../../../../lib/errors/types';

interface ErrorGroupsTableProps {
  groups: ErrorGroup[];
}

export function ErrorGroupsTable(props: ErrorGroupsTableProps) {
  const { groups } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Message</th>
            <th className="w-32 px-4 py-2.5 font-medium">Queue</th>
            <th className="w-20 px-4 py-2.5 text-right font-medium">Count</th>
            <th className="w-36 px-4 py-2.5 font-medium">First seen</th>
            <th className="w-36 px-4 py-2.5 font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              key={group.id}
              data-testid="error-group-row"
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="max-w-0 px-5 py-3">
                <Link href={`/errors/${group.id}`} className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-content-emphasis hover:underline">
                    {group.message}
                  </span>
                  {group.isRegression && (
                    <StatusBadge variant="error" className="shrink-0">
                      regression
                    </StatusBadge>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-xs text-content-subtle">
                  {group.queueName}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-content-default">
                {group.count}
              </td>
              <td className="px-4 py-3 text-content-subtle">
                {formatDistanceToNowStrict(group.firstSeenTs, { addSuffix: true })}
              </td>
              <td className="px-4 py-3 text-content-subtle">
                {formatDistanceToNowStrict(group.lastSeenTs, { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
