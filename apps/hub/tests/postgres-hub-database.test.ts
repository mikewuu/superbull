import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsertValues = vi.fn();
const mockInsertReturningAll = vi.fn();
const mockInsertExecuteTakeFirstOrThrow = vi.fn();
const mockInsertInto = vi.fn(() => ({ values: mockInsertValues }));

const mockDeleteWhere = vi.fn();
const mockDeleteExecute = vi.fn();
const mockDeleteFrom = vi.fn(() => ({ where: mockDeleteWhere }));

mockInsertValues.mockReturnValue({ returningAll: mockInsertReturningAll });
mockInsertReturningAll.mockReturnValue({
  executeTakeFirstOrThrow: mockInsertExecuteTakeFirstOrThrow,
});
mockDeleteWhere.mockReturnValue({ execute: mockDeleteExecute });

const mockDb = {
  insertInto: mockInsertInto,
  deleteFrom: mockDeleteFrom,
};

vi.mock('../src/lib/db/connect-db', () => ({
  connectDb: vi.fn(async () => mockDb),
}));

describe('createPostgresHubDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSource inserts snake_case values and maps proxy_token to token', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    mockInsertExecuteTakeFirstOrThrow.mockResolvedValue({
      id: 'source-1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      proxy_token: 'secret-token',
      created_at: createdAt,
    });

    const { createPostgresHubDatabase } = await import('../src/lib/db/postgres-hub-database');
    const database = createPostgresHubDatabase();

    const source = await database.createSource({
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret-token',
    });

    expect(mockInsertInto).toHaveBeenCalledWith('proxy_sources');
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'proxy-a',
        url: 'https://proxy-a.example.com',
        proxy_token: 'secret-token',
      }),
    );
    expect(source).toEqual({
      id: 'source-1',
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret-token',
      created_at: createdAt,
    });
  });

  it('deleteSource issues a delete by id', async () => {
    mockDeleteExecute.mockResolvedValue(undefined);

    const { createPostgresHubDatabase } = await import('../src/lib/db/postgres-hub-database');
    const database = createPostgresHubDatabase();

    await database.deleteSource('source-1');

    expect(mockDeleteFrom).toHaveBeenCalledWith('proxy_sources');
    expect(mockDeleteWhere).toHaveBeenCalledWith('id', '=', 'source-1');
  });
});
