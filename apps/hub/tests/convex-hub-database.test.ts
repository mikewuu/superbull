import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const mockMutation = vi.fn();

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    mutation: mockMutation,
  })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud');
  vi.stubEnv('CONVEX_INTERNAL_TOKEN', 'internal-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createConvexHubDatabase', () => {
  it('injects internalToken and maps _id to id on listSources', async () => {
    mockQuery.mockResolvedValue([
      {
        _id: 'doc-1',
        _creationTime: 1735689600000,
        name: 'proxy-a',
        url: 'https://proxy-a.example.com',
        token: 'secret',
      },
    ]);

    const { createConvexHubDatabase } = await import('../src/lib/db/convex-hub-database');
    const sources = await createConvexHubDatabase().listSources();

    expect(mockQuery).toHaveBeenCalledWith(expect.anything(), { internalToken: 'internal-secret' });
    expect(sources).toEqual([
      {
        id: 'doc-1',
        name: 'proxy-a',
        url: 'https://proxy-a.example.com',
        token: 'secret',
        created_at: new Date(1735689600000),
      },
    ]);
  });

  it('injects internalToken and maps the doc on createSource', async () => {
    mockMutation.mockResolvedValue({
      _id: 'doc-2',
      _creationTime: 1735689600000,
      name: 'proxy-b',
      url: 'https://proxy-b.example.com',
      token: 'secret-b',
    });

    const { createConvexHubDatabase } = await import('../src/lib/db/convex-hub-database');
    const source = await createConvexHubDatabase().createSource({
      name: 'proxy-b',
      url: 'https://proxy-b.example.com',
      token: 'secret-b',
    });

    expect(mockMutation).toHaveBeenCalledWith(expect.anything(), {
      internalToken: 'internal-secret',
      name: 'proxy-b',
      url: 'https://proxy-b.example.com',
      token: 'secret-b',
    });
    expect(source).toEqual({
      id: 'doc-2',
      name: 'proxy-b',
      url: 'https://proxy-b.example.com',
      token: 'secret-b',
      created_at: new Date(1735689600000),
    });
  });

  it('throws when convex env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', undefined);
    vi.stubEnv('CONVEX_INTERNAL_TOKEN', undefined);

    const { createConvexHubDatabase } = await import('../src/lib/db/convex-hub-database');

    expect(() => createConvexHubDatabase()).toThrow(
      'NEXT_PUBLIC_CONVEX_URL and CONVEX_INTERNAL_TOKEN are required for the convex hub database',
    );
  });
});
