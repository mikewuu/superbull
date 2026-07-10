import type { HubDatabase } from './hub-database';
import type { ProxySource } from './types';

export function createMemoryHubDatabase(): HubDatabase {
  const sources = new Map<string, ProxySource>();

  return {
    async listSources() {
      return Array.from(sources.values());
    },
    async findSourceById(id) {
      return sources.get(id) ?? null;
    },
    async createSource(args) {
      const source: ProxySource = {
        id: crypto.randomUUID(),
        name: args.name,
        url: args.url,
        token: args.token,
        created_at: new Date(),
      };
      sources.set(source.id, source);
      return source;
    },
    async deleteSource(id) {
      sources.delete(id);
    },
  };
}
