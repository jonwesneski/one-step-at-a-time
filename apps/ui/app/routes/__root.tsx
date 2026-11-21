import { NavBar } from '@/components/NavBar';
import appCss from '@/globals.css?url';
import { THEME_INIT_SCRIPT } from '@/hooks/useTheme';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
    ],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'One Step at a Time' },
    ],
    scripts: [{ children: THEME_INIT_SCRIPT }],
  }),
  component: Root,
  notFoundComponent: NotFound,
});

function NotFound() {
  return <p>Page not found.</p>;
}

function Root() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <header className="flex items-center gap-4 border-b border-line bg-surface px-6 py-4 z-10">
          <NavBar />
          <input
            type="text"
            placeholder="Search..."
            disabled
            className="border border-line bg-surface rounded-md px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-line-strong"
          />
        </header>
        <main className="flex flex-1 flex-col p-6">
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  );
}
