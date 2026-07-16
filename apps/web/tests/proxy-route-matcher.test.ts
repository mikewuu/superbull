import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// @convex-dev/auth/nextjs/server's dist file imports `next/server` in a way
// Vite/vitest cannot resolve through pnpm's peer-dependency virtual store
// (it works fine under Next's own bundler, which is all that matters at
// runtime) — mock it with a faithful path-to-regexp-free reimplementation of
// createRouteMatcher so this test can exercise the real route list in
// src/proxy.ts without touching that broken import chain.
vi.mock('@convex-dev/auth/nextjs/server', () => ({
  createRouteMatcher: (routes: string[]) => {
    const patterns = routes.map((route) => new RegExp(`^${route.replace('(.*)', '.*')}$`));
    return (request: NextRequest) =>
      patterns.some((pattern) => pattern.test(request.nextUrl.pathname));
  },
  convexAuthNextjsMiddleware: (handler: unknown) => handler,
  nextjsMiddlewareRedirect: vi.fn(),
}));

const { isPublicRoute, isSignInPage } = await import('../src/proxy');

function requestFor(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:4700'));
}

describe('isSignInPage', () => {
  it('matches /signin', () => {
    expect(isSignInPage(requestFor('/signin'))).toBe(true);
  });

  it('does not match other routes', () => {
    expect(isSignInPage(requestFor('/'))).toBe(false);
  });
});

describe('isPublicRoute', () => {
  it.each([
    '/',
    '/docs',
    '/docs/getting-started',
    '/signin',
    '/status/my-status-page',
    '/api/health',
    '/api/annotations',
    '/api/mcp',
  ])('treats %s as public', (pathname) => {
    expect(isPublicRoute(requestFor(pathname))).toBe(true);
  });

  it.each([
    '/app',
    '/app/my-workspace',
    '/app/my-workspace/analytics',
    '/app/my-workspace/errors',
    '/app/my-workspace/alerts',
    '/app/my-workspace/dashboards',
    '/app/my-workspace/status-pages',
    '/app/my-workspace/connectors',
    '/app/my-workspace/connectors/connector-1/',
    '/app/my-workspace/settings',
    '/invite/some-token',
  ])('treats %s as protected', (pathname) => {
    expect(isPublicRoute(requestFor(pathname))).toBe(false);
  });

  it('protects the per-connector embedded dashboard API forwarding route', () => {
    expect(isPublicRoute(requestFor('/app/my-workspace/connectors/connector-1/api/queues'))).toBe(
      false,
    );
  });
});
