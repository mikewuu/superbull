import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '../../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { findConnectorById } from '../../../../../../lib/connectors/find-connector-by-id';
import { renderSpaEntry } from '../../../../../../lib/forwarding/render-spa-entry';

const contentTypes: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

let entryTemplate: string | undefined;
let tokensCss: string | undefined;

export async function GET(
  _req: Request,
  context: { params: Promise<{ projectSlug: string; connectorId: string; rest?: string[] }> },
): Promise<NextResponse> {
  const { projectSlug, connectorId, rest = [] } = await context.params;
  const distDir = getReactDistDir();

  if (rest[0] === 'static') {
    return serveStaticAsset(distDir, rest.slice(1));
  }

  // Verify project membership before ever looking at the connector — a
  // caller who isn't a member of projectSlug gets the same 404 a bad slug
  // gets, never a peek at another tenant's connector.
  const token = await convexAuthNextjsToken();
  const resolved = await fetchQuery(
    api.projects.findProjectBySlug,
    { slug: projectSlug },
    { token },
  );
  if (!resolved) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 });
  }

  const connector = await findConnectorById(resolved.project._id, connectorId as Id<'connectors'>);
  if (!connector) {
    return NextResponse.json({ error: 'connector not found' }, { status: 404 });
  }
  // Never connected to the gateway yet: the dashboard would only render 502
  // "connector disconnected" errors, so show enrollment guidance instead.
  if (connector.lastConnectedAt === null) {
    return new NextResponse(
      await renderPendingHtml({
        connectorName: connector.name,
        connectorsHref: `/app/${projectSlug}/connectors`,
      }),
      {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      },
    );
  }

  const template = await getEntryTemplate(distDir);
  const html = renderSpaEntry({
    template,
    basePath: `/app/${projectSlug}/connectors/${connectorId}/`,
    title: `${connector.name} · SuperBull`,
    uiConfig: JSON.stringify({ board_title: connector.name }),
  });

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// Styled with the design system's tokens.css (inlined; this route serves raw
// HTML outside the app's CSS pipeline). Meta-refreshes every 5s so the deep
// link swaps itself for the dashboard as soon as the connector dials in.
async function renderPendingHtml(args: {
  connectorName: string;
  connectorsHref: string;
}): Promise<string> {
  const tokens = await getTokensCss();
  const name = escapeHtml(args.connectorName);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="5">
<title>Waiting for connector · SuperBull</title>
<style>
${tokens}
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: rgb(var(--bg-muted)); color: rgb(var(--content-default)); }
main { max-width: 26rem; margin: 1rem; padding: 1.75rem; background: rgb(var(--bg-default)); border: 1px solid rgb(var(--border-subtle)); border-radius: 0.75rem; }
.badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.125rem 0.5rem; border-radius: 0.25rem; background: rgb(var(--bg-attention)); color: rgb(var(--content-attention)); font-size: 0.6875rem; font-weight: 500; }
.dot { width: 0.375rem; height: 0.375rem; border-radius: 9999px; background: rgb(var(--content-attention)); }
h1 { margin: 0.75rem 0 0; font-size: 1rem; font-weight: 600; color: rgb(var(--content-emphasis)); }
p { margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.5; color: rgb(var(--content-subtle)); }
a { display: inline-block; margin-top: 1rem; font-size: 0.875rem; font-weight: 500; color: rgb(var(--content-emphasis)); }
</style>
</head>
<body>
<main>
<span class="badge"><span class="dot"></span>pending</span>
<h1>Waiting for ${name} to connect</h1>
<p>Run the connector command from the Connectors page next to your Redis. This page refreshes automatically and the dashboard appears as soon as it dials in.</p>
<a href="${args.connectorsHref}">Back to connectors</a>
</main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getReactDistDir(): string {
  return path.join(process.cwd(), 'node_modules', '@superbull/react', 'dist');
}

async function getEntryTemplate(distDir: string): Promise<string> {
  if (!entryTemplate) {
    entryTemplate = await readFile(path.join(distDir, 'index.ejs'), 'utf8');
  }
  return entryTemplate;
}

async function getTokensCss(): Promise<string> {
  if (!tokensCss) {
    tokensCss = await readFile(
      path.join(process.cwd(), 'node_modules', '@superbull/ui', 'src', 'styles', 'tokens.css'),
      'utf8',
    );
  }
  return tokensCss;
}

async function serveStaticAsset(distDir: string, segments: string[]): Promise<NextResponse> {
  const staticDir = path.join(distDir, 'static');
  const resolved = path.resolve(staticDir, ...segments);
  const withinStaticDir = resolved === staticDir || resolved.startsWith(`${staticDir}${path.sep}`);
  if (!withinStaticDir) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  let file: Buffer;
  try {
    file = await readFile(resolved);
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const contentType = contentTypes[path.extname(resolved)] ?? 'application/octet-stream';
  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'public,max-age=31536000,immutable',
    },
  });
}
