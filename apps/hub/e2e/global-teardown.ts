import { existsSync, renameSync } from 'node:fs';

export default function globalTeardown(): void {
  if (existsSync('.env.local.e2e-stash')) {
    renameSync('.env.local.e2e-stash', '.env.local');
  }
}
