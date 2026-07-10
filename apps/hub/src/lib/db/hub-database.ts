import type { ProxySource } from './types';

export interface HubDatabase {
  listSources(): Promise<ProxySource[]>;
  findSourceById(id: string): Promise<ProxySource | null>;
  createSource(args: { name: string; url: string; token: string }): Promise<ProxySource>;
  deleteSource(id: string): Promise<void>;
}
