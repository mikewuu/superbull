import { Database } from 'lucide-react';
import { useRedisStats } from '../../../hooks/use-redis-stats';

export function RedisStatsCard() {
  const { data: stats } = useRedisStats();

  if (!stats?.version) {
    return null;
  }

  return (
    <div className="candy-card flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg px-5 py-4">
      <div className="flex items-center gap-2 text-sm font-medium text-content-emphasis">
        <Database className="size-4 text-content-subtle" />
        Redis {stats.version}
      </div>
      <StatItem label="Mode" value={stats.mode ?? '-'} />
      <StatItem label="Uptime" value={formatUptime(stats.uptime ?? 0)} />
      <StatItem label="Memory used" value={formatBytes(stats.memory?.used ?? 0)} />
      <StatItem label="Peak memory" value={formatBytes(stats.memory?.peak ?? 0)} />
      <StatItem label="Clients" value={`${stats.clients?.connected ?? 0}`} />
    </div>
  );
}

function StatItem(props: { label: string; value: string }) {
  const { label, value } = props;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-content-subtle">{label}</span>
      <span className="font-mono text-sm text-content-emphasis">{value}</span>
    </div>
  );
}

function formatUptime(uptimeSec: number): string {
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}
