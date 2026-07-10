import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { renderSpaEntry } from '../../../../lib/forwarding/render-spa-entry';
import { findSourceById } from '../../../../lib/sources/find-source-by-id';

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
  context: { params: Promise<{ sourceId: string; rest?: string[] }> },
): Promise<NextResponse> {
  const { sourceId, rest = [] } = await context.params;
  const distDir = getReactDistDir();

  if (rest[0] === 'static') {
    return serveStaticAsset(distDir, rest.slice(1));
  }

  const source = await findSourceById(sourceId);
  if (!source) {
    return NextResponse.json({ error: 'source not found' }, { status: 404 });
  }

  const template = await getEntryTemplate(distDir);
  const html = renderSpaEntry({
    template,
    basePath: `/s/${sourceId}/`,
    title: `${source.name} — bullwatch`,
    uiConfig: JSON.stringify({ board_title: source.name }),
  });

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html', 'cache-control': 'no-store' },
  });
}

function getReactDistDir(): string {
  return path.join(process.cwd(), 'node_modules', '@bullwatch/react', 'dist');
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
