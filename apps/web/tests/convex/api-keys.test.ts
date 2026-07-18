/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { INTERNAL_TOKEN, makeTestClient, seedProject } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

describe('api keys', () => {
  it('mints multiple named keys per user and rejects a duplicate name', async () => {
    const t = makeTestClient();
    const { asMember } = await seedProject(t);

    await asMember.mutation(api.apiKeys.insertApiKey, {
      name: 'Claude',
      keyHash: 'a'.repeat(64),
      keyPrefix: 'sbh_aaaaaaaa…',
    });
    await asMember.mutation(api.apiKeys.insertApiKey, {
      name: 'CI',
      keyHash: 'b'.repeat(64),
      keyPrefix: 'sbh_bbbbbbbb…',
    });

    const apiKeys = await asMember.query(api.apiKeys.listApiKeys, {});
    expect(apiKeys.map((apiKey) => apiKey.name)).toEqual(['Claude', 'CI']);
    await expect(
      asMember.mutation(api.apiKeys.insertApiKey, {
        name: ' Claude ',
        keyHash: 'c'.repeat(64),
        keyPrefix: 'sbh_cccccccc…',
      }),
    ).rejects.toThrow('Key name already exists');
  });

  it('resolves an active key to its user and stops resolving it after revoke', async () => {
    const t = makeTestClient();
    const { userId, asMember } = await seedProject(t);
    const keyHash = 'd'.repeat(64);
    const apiKeyId = await asMember.mutation(api.apiKeys.insertApiKey, {
      name: 'Local',
      keyHash,
      keyPrefix: 'sbh_dddddddd…',
    });

    const caller = await t.mutation(api.apiKeys.findApiKeyCaller, {
      internalToken: INTERNAL_TOKEN,
      keyHash,
    });
    expect(caller).toEqual({ userId, projectId: null, scopes: ['mcp'] });

    await asMember.mutation(api.apiKeys.revokeApiKey, { apiKeyId });
    const revokedCaller = await t.mutation(api.apiKeys.findApiKeyCaller, {
      internalToken: INTERNAL_TOKEN,
      keyHash,
    });
    expect(revokedCaller).toBeNull();
  });
});
