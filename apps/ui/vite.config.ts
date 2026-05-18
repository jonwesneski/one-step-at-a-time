import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    // tanstackStart MUST come before viteReact
    tanstackStart({
      srcDirectory: 'app',
      spa: {
        enabled: true,
      },
      router: {
        routesDirectory: 'routes',
        generatedRouteTree: 'routeTree.gen.ts',
      },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  resolve: {
    // Resolve source TypeScript files in dev via the custom exports condition
    conditions: ['one-step-at-a-time', 'browser', 'module', 'main'],
  },
  ssr: {
    // Bundle web-components for SSR so the custom condition is respected.
    // ClientOnly wrapper prevents DOM/customElements calls from running server-side.
    noExternal: ['@one-step-at-a-time/web-components'],
    resolve: {
      conditions: ['one-step-at-a-time', 'module', 'main'],
    },
  },
  optimizeDeps: {
    include: ['@one-step-at-a-time/web-components'],
  },
});
