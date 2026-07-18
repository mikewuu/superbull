import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET } from '../src/app/api/openapi.json/route';

const routesOutsidePublicRestContract = new Set([
  '/api/mcp',
  '/api/oauth/authorize/approve',
  '/api/openapi.json',
]);

describe('GET /api/openapi.json', () => {
  it('serves an OpenAPI 3.1 document matching the live public REST routes', async () => {
    const response = GET();
    const spec = (await response.json()) as {
      openapi: string;
      paths: Record<string, Record<string, unknown>>;
    };

    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(spec.openapi).toBe('3.1.0');
    expect(getDocumentedRoutes(spec.paths)).toEqual(getLiveRoutes());
  });
});

function getDocumentedRoutes(paths: Record<string, Record<string, unknown>>): string[] {
  return Object.entries(paths)
    .flatMap(([routePath, operations]) =>
      Object.keys(operations).map((method) => `${method.toUpperCase()} ${routePath}`),
    )
    .sort();
}

function getLiveRoutes(): string[] {
  const appDirectory = path.resolve(process.cwd(), 'src/app');
  return listRouteFiles(appDirectory)
    .flatMap((filePath) => getRoutesFromFile(appDirectory, filePath))
    .sort();
}

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRouteFiles(entryPath);
    }
    return entry.name === 'route.ts' ? [entryPath] : [];
  });
}

function getRoutesFromFile(appDirectory: string, filePath: string): string[] {
  const routePath = toRoutePath(appDirectory, filePath);
  if (
    (!routePath.startsWith('/api/') && !routePath.startsWith('/.well-known/')) ||
    routesOutsidePublicRestContract.has(routePath)
  ) {
    return [];
  }

  const source = readFileSync(filePath, 'utf8');
  const methods = source.matchAll(
    /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g,
  );
  return Array.from(methods, (match) => `${match[1]} ${routePath}`);
}

function toRoutePath(appDirectory: string, filePath: string): string {
  return `/${path
    .relative(appDirectory, path.dirname(filePath))
    .split(path.sep)
    .map((segment) => segment.replace(/^\[\.\.\.(.+)]$/, '{$1}').replace(/^\[(.+)]$/, '{$1}'))
    .join('/')}`;
}
