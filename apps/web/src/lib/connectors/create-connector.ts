import { createHash, randomBytes } from 'node:crypto';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toConnector } from './to-connector';
import type { Connector } from './types';

export interface CreateConnectorResult {
  connector: Connector;
  // Shown to the user exactly once — only its sha256 hash is stored.
  token: string;
}

// Convex's runtime has no node:crypto, so the enrollment token is generated
// here (the Next server action) and only its hash is ever sent to Convex.
export async function createConnector(
  projectId: Id<'projects'>,
  name: string,
): Promise<CreateConnectorResult> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const authToken = await convexAuthNextjsToken();
  const doc = await fetchMutation(
    api.connectors.createConnector,
    { projectId, name, tokenHash },
    { token: authToken },
  );

  return { connector: toConnector(doc), token };
}
