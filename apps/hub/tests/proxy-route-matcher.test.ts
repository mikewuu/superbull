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
  return new NextRequest(new URL(pathname, 'http://localhost:4600'));
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
    '/signin',
    '/status/my-status-page',
    '/api/health',
    '/api/ingest',
    '/api/sources/register',
    '/api/annotations',
    '/api/mcp',
    '/api/sources',
    '/api/sources/source-1',
  ])('treats %s as public', (pathname) => {
    expect(isPublicRoute(requestFor(pathname))).toBe(true);
  });

  it.each([
    '/',
    '/analytics',
    '/errors',
    '/alerts',
    '/dashboards',
    '/status-pages',
    '/s/source-1/',
  ])('treats %s as protected', (pathname) => {
    expect(isPublicRoute(requestFor(pathname))).toBe(false);
  });

  it('protects the per-source dashboard API forwarding route', () => {
    expect(isPublicRoute(requestFor('/s/source-1/api/queues'))).toBe(false);
  });
});
