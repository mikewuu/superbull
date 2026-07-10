import { execSync } from 'node:child_process';

export default function globalSetup(): void {
  execSync('npx convex env set CONVEX_INTERNAL_TOKEN e2e-internal', { stdio: 'inherit' });
}
