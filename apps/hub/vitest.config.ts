import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/convex/**', 'edge-runtime']],
    exclude: ['node_modules/**', 'e2e/**'],
  },
});
