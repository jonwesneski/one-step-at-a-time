import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import appCss from '../globals.css?url';

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
  }),
  component: Root,
  notFoundComponent: NotFound,
});

function NotFound() {
  return <p>Page not found.</p>;
}

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col bg-zinc-50 font-sans">
        <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-4">
          <nav>
            <Link to="/">
              <span className="flex items-center justify-center h-7 w-7 rounded-full border border-zinc-900">
                <img
                  src="/logo.svg"
                  alt="One Step at a Time"
                  className="h-5 w-5"
                />
              </span>
            </Link>
          </nav>
          <input
            type="text"
            placeholder="Search..."
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </header>
        <main className="p-6">
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  );
}
