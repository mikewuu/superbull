import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/s/[sourceId]/[[...rest]]': ['./node_modules/@bullwatch/react/dist/**'],
  },
};

export default nextConfig;
