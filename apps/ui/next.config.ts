import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@rest-in-time/design-system'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  webpack(config) {
    config.resolve.conditionNames = [
      'rest-in-time',
      ...config.resolve.conditionNames,
    ];
    return config;
  },
};

export default nextConfig;
