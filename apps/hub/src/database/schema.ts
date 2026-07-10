import type { ColumnType } from 'kysely';

export interface ProxySourcesTable {
  id: string;
  name: string;
  url: string;
  proxy_token: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, never>;
}

export interface HubSchema {
  proxy_sources: ProxySourcesTable;
}
