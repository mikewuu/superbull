import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/app/[workspaceSlug]/connectors/[connectorId]/[[...rest]]': [
      './node_modules/@superbull/react/dist/**',
    ],
  },
};

export default nextConfig;
