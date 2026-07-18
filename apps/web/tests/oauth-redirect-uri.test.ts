import { describe, expect, it } from 'vitest';
import { isAllowedRedirectUri } from '../src/app/oauth/is-allowed-redirect-uri';
import { isRedirectUriRegistered } from '../src/app/oauth/is-redirect-uri-registered';

describe('OAuth redirect URIs', () => {
  it.each([
    ['http://127.0.0.1:4100/callback', 'http://127.0.0.1:5200/callback'],
    ['http://localhost:4100/callback', 'http://localhost:5200/callback'],
    ['http://[::1]:4100/callback', 'http://[::1]:5200/callback'],
  ])('allows an arbitrary loopback port for %s', (registered, presented) => {
    expect(isAllowedRedirectUri(registered)).toBe(true);
    expect(isRedirectUriRegistered([registered], presented)).toBe(true);
  });

  it('keeps non-loopback redirects exact and rejects unsafe redirects', () => {
    expect(
      isRedirectUriRegistered(
        ['https://client.example:4100/callback'],
        'https://client.example:5200/callback',
      ),
    ).toBe(false);
    expect(isAllowedRedirectUri('http://client.example/callback')).toBe(false);
    expect(isAllowedRedirectUri('https://client.example/callback#fragment')).toBe(false);
  });
});
