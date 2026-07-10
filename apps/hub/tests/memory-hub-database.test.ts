import { describe, expect, it } from 'vitest';
import { createMemoryHubDatabase } from '../src/lib/db/memory-hub-database';

describe('createMemoryHubDatabase', () => {
  it('supports a full CRUD roundtrip', async () => {
    const database = createMemoryHubDatabase();

    const created = await database.createSource({
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret-token',
    });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('proxy-a');
    expect(created.url).toBe('https://proxy-a.example.com');
    expect(created.token).toBe('secret-token');
    expect(created.created_at).toBeInstanceOf(Date);

    expect(await database.listSources()).toEqual([created]);
    expect(await database.findSourceById(created.id)).toEqual(created);

    await database.deleteSource(created.id);
    expect(await database.listSources()).toEqual([]);
  });

  it('findSourceById returns null on miss', async () => {
    const database = createMemoryHubDatabase();

    expect(await database.findSourceById('missing-id')).toBeNull();
  });
});
