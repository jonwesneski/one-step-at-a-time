import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@one-step-at-a-time/web-components'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  webpack(config) {
    config.resolve.conditionNames = [
      'one-step-at-a-time',
      ...config.resolve.conditionNames,
    ];
    return config;
  },
};

export default nextConfig;
