import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server';

// Next 16 renamed `middleware.ts` to `proxy.ts` — a root middleware.ts is
// loaded but never applied. This file must live at src/proxy.ts.
export const isSignInPage = createRouteMatcher(['/signin']);

// The marketing site (/) and docs (/docs/**) are always public. So are the
// public status pages (recipient-facing) and every /api/* route below,
// which authenticates headlessly with its own bearer token for
// proxies/CI/agents. Everything under /app (the product), plus /s/**
// (per-source dashboards, which expose queue data) requires sign-in.
export const isPublicRoute = createRouteMatcher([
  '/',
  '/docs(.*)',
  '/signin',
  '/status/(.*)',
  '/api/health',
  '/api/ingest',
  '/api/sources/register',
  '/api/annotations',
  '/api/mcp',
  '/api/sources(.*)',
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, '/app');
  }
  if (!isPublicRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, '/signin');
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
