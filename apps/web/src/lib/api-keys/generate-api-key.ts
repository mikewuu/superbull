import { randomBytes } from 'node:crypto';
import { hashToken } from '../auth/hash-token';

export function generateApiKey(): { apiKey: string; keyHash: string; keyPrefix: string } {
  const apiKey = `sbh_${randomBytes(24).toString('hex')}`;
  return {
    apiKey,
    keyHash: hashToken(apiKey),
    keyPrefix: `${apiKey.slice(0, 12)}…`,
  };
}
