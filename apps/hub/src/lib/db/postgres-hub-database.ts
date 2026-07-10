import type { Kysely } from 'kysely';
import type { HubSchema } from '../../database/schema';
import { connectDb } from './connect-db';
import type { HubDatabase } from './hub-database';
import type { ProxySource } from './types';

let dbPromise: Promise<Kysely<HubSchema>> | undefined;

function getDb() {
  dbPromise ??= connectDb();
  return dbPromise;
}

export function createPostgresHubDatabase(): HubDatabase {
  return {
    async listSources() {
      const db = await getDb();
      const rows = await db.selectFrom('proxy_sources').selectAll().execute();
      return rows.map(toProxySource);
    },
    async findSourceById(id) {
      const db = await getDb();
      const row = await db
        .selectFrom('proxy_sources')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      return row ? toProxySource(row) : null;
    },
    async createSource(args) {
      const db = await getDb();
      const row = await db
        .insertInto('proxy_sources')
        .values({
          id: crypto.randomUUID(),
          name: args.name,
          url: args.url,
          proxy_token: args.token,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return toProxySource(row);
    },
    async deleteSource(id) {
      const db = await getDb();
      await db.deleteFrom('proxy_sources').where('id', '=', id).execute();
    },
  };
}

function toProxySource(row: {
  id: string;
  name: string;
  url: string;
  proxy_token: string;
  created_at: Date;
}): ProxySource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    token: row.proxy_token,
    created_at: row.created_at,
  };
}
