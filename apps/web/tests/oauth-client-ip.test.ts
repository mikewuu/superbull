import { describe, expect, it } from 'vitest';
import { getClientIp } from '../src/app/oauth/get-client-ip';

describe('OAuth client IP', () => {
  it('uses the platform-provided client IP instead of a spoofed forwarded chain', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.8',
      'x-forwarded-for': '198.51.100.2, 192.0.2.4',
    });

    expect(getClientIp(headers)).toBe('203.0.113.8');
  });

  it('uses the trusted-side entry when only a forwarded chain is available', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.2, 192.0.2.4',
    });

    expect(getClientIp(headers)).toBe('192.0.2.4');
  });
});
