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
// which authenticates headlessly with its own bearer token for CI/agents.
// Everything under /app (the product, including the per-connector embedded
// dashboards at /app/[workspaceSlug]/connectors/[connectorId]/**, which
// replaced the old top-level /s/[sourceId] routes) requires sign-in — the
// /app(.*) prefix match below covers those nested routes automatically.
// /invite/[token] is deliberately NOT in this list: it must require sign-in
// too (redirect to /signin like /app does) so the accept page always renders
// with a real session; see src/app/invite/[token]/page.tsx.
export const isPublicRoute = createRouteMatcher([
  '/',
  '/docs(.*)',
  '/signin',
  '/status/(.*)',
  '/api/health',
  '/api/annotations',
  '/api/mcp',
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
