import { NextResponse } from 'next/server';
import { buildOpenApiSpec } from '../../../lib/openapi/build-openapi-spec';

export function GET() {
  return NextResponse.json(buildOpenApiSpec(), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
