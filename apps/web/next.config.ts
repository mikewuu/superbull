import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/app/[workspaceSlug]/connectors/[connectorId]/[[...rest]]': [
      './node_modules/@superbull/react/dist/**',
      './node_modules/@superbull/ui/src/styles/tokens.css',
    ],
  },
};

export default nextConfig;
