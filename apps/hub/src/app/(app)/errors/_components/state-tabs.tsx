import Link from 'next/link';
import type { ErrorsTab } from '../page';

interface StateTabsProps {
  activeSourceId: string;
  activeTab: ErrorsTab;
  counts: Record<ErrorsTab, number>;
}

const tabs: Array<{ key: ErrorsTab; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'regressions', label: 'Regressions' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'ignored', label: 'Ignored' },
];

export function StateTabs(props: StateTabsProps) {
  const { activeSourceId, activeTab, counts } = props;

  return (
    <div className="flex items-center gap-1 border-b border-border-subtle">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/errors?source=${activeSourceId}&state=${tab.key}`}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-2sm font-medium text-content-subtle transition-colors duration-150 ease-snout hover:text-content-emphasis ${
            tab.key === activeTab ? 'border-blue-600 text-content-emphasis' : 'border-transparent'
          }`}
        >
          {tab.label}
          <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[11px] text-content-muted">
            {counts[tab.key]}
          </span>
        </Link>
      ))}
    </div>
  );
}
