import { execSync } from 'node:child_process';

export default function globalSetup() {
  execSync('npx tsx seed.ts', {
    cwd: import.meta.dirname ? `${import.meta.dirname}/..` : '.',
    stdio: 'inherit',
    env: {
      ...process.env,
      REDIS_HOST: process.env.REDIS_HOST ?? '127.0.0.1',
      REDIS_PORT: process.env.REDIS_PORT ?? '6379',
    },
  });
}
