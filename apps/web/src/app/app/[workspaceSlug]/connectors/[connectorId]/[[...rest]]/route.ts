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

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceSlug: string; connectorId: string; rest?: string[] }> },
): Promise<NextResponse> {
  const { workspaceSlug, connectorId, rest = [] } = await context.params;
  const distDir = getReactDistDir();

  if (rest[0] === 'static') {
    return serveStaticAsset(distDir, rest.slice(1));
  }

  // Verify workspace membership before ever looking at the connector — a
  // caller who isn't a member of workspaceSlug gets the same 404 a bad slug
  // gets, never a peek at another tenant's connector.
  const token = await convexAuthNextjsToken();
  const resolved = await fetchQuery(
    api.workspaces.findWorkspaceBySlug,
    { slug: workspaceSlug },
    { token },
  );
  if (!resolved) {
    return NextResponse.json({ error: 'workspace not found' }, { status: 404 });
  }

  const connector = await findConnectorById(
    resolved.workspace._id,
    connectorId as Id<'connectors'>,
  );
  if (!connector) {
    return NextResponse.json({ error: 'connector not found' }, { status: 404 });
  }
  if (!connector.url) {
    return new NextResponse(
      renderPendingHtml(
        `"${connector.name}" hasn't been enrolled through the legacy proxy flow yet, so its dashboard isn't reachable here.`,
      ),
      { status: 200, headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } },
    );
  }

  const template = await getEntryTemplate(distDir);
  const html = renderSpaEntry({
    template,
    basePath: `/app/${workspaceSlug}/connectors/${connectorId}/`,
    title: `${connector.name} · SuperBull`,
    uiConfig: JSON.stringify({ board_title: connector.name }),
  });

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html', 'cache-control': 'no-store' },
  });
}

function renderPendingHtml(message: string): string {
  return `<!doctype html><html><body style="font-family: sans-serif; padding: 2rem;"><p>${message}</p></body></html>`;
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
