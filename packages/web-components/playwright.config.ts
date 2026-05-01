import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './src',
  testMatch: /.*\.browser-test\.ts$/,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5179/test-fixtures/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm exec vite serve --port 5179 --strictPort',
    url: 'http://localhost:5179/test-fixtures/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: dirname,
  },
});
