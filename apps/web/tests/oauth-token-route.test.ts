import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  isWithinRateLimitForIp: vi.fn(),
}));

vi.mock('../src/lib/convex/create-server-convex-client', () => ({
  createServerConvexClient: () => ({ mutation: mocks.mutation }),
}));

vi.mock('../src/lib/api/is-within-rate-limit-for-ip', () => ({
  isWithinRateLimitForIp: mocks.isWithinRateLimitForIp,
}));

import { POST } from '../src/app/api/oauth/token/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isWithinRateLimitForIp.mockResolvedValue(true);
  mocks.mutation.mockResolvedValue({ expiresInSeconds: 3600 });
});

describe('POST /api/oauth/token', () => {
  it('returns the fixed access and refresh token prefixes', async () => {
    const response = await POST(
      new Request('http://localhost/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'authorization-code',
          client_id: 'sbc_test',
          redirect_uri: 'http://127.0.0.1:4100/callback',
          code_verifier: 'oauth-verifier-1234567890-abcdefghijklmnopqrstuv',
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      access_token: expect.stringMatching(/^sbho_/),
      refresh_token: expect.stringMatching(/^sbhr_/),
      token_type: 'bearer',
      scope: 'mcp',
    });
  });
});
