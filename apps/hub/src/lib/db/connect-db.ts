import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { getConnectionStringFromEnv } from 'pg-connection-from-env';
import type { HubSchema } from '../../database/schema';

export async function connectDb(): Promise<Kysely<HubSchema>> {
  return new Kysely<HubSchema>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: getConnectionStringFromEnv() }),
    }),
  });
}
