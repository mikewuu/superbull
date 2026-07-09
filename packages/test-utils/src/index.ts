import path from 'node:path';
import { fileURLToPath } from 'node:url';

export * from './redis-fixtures';
export * from './server-adapter-contract';

// src/ui-fixture/dist mirrors the real UI build layout so createBoard resolves
// view templates and static files the same way a production adapter would.
export const uiFixtureBasePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'ui-fixture',
);
