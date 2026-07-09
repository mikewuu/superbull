import type { BoardRequest, HandlerResponse } from '../types';

export async function getRedisStats(req: BoardRequest): Promise<HandlerResponse> {
  const [queue] = req.queues.values();
  if (!queue) {
    return { body: {} };
  }

  const info = parseRedisInfo(await queue.getRedisInfo());

  return {
    body: {
      version: info.redis_version,
      mode: info.redis_mode,
      port: Number(info.tcp_port),
      os: info.os,
      uptime: Number(info.uptime_in_seconds),
      memory: {
        total: Number(info.maxmemory) || Number(info.total_system_memory),
        used: Number(info.used_memory),
        fragmentation_ratio: Number(info.mem_fragmentation_ratio),
        peak: Number(info.used_memory_peak),
      },
      clients: {
        connected: Number(info.connected_clients),
        blocked: Number(info.blocked_clients),
      },
    },
  };
}

function parseRedisInfo(raw: string): Record<string, string> {
  const lines = raw.split(/\r?\n/).filter((line) => line.includes(':') && !line.startsWith('#'));
  const entries = lines.map((line) => {
    const separatorIndex = line.indexOf(':');
    return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)] as const;
  });

  return Object.fromEntries(entries);
}
