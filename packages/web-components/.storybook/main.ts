import type { StorybookConfig } from '@storybook/web-components-vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { mergeConfig } from 'vite';

// GitHub Pages serves this project site from a sub-path; a production build must
// know it so asset URLs resolve. Local dev and other hosts stay at the root.
const PAGES_BASE_PATH = '/one-step-at-a-time/';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [getAbsolutePath('@storybook/addon-docs')],
  framework: {
    name: getAbsolutePath('@storybook/web-components-vite'),
    options: {},
  },

  viteFinal: async (config, { configType }) =>
    mergeConfig(config, {
      base: configType === 'PRODUCTION' ? PAGES_BASE_PATH : '/',
      plugins: [nxViteTsPaths()],
    }),
};

export default config;

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
