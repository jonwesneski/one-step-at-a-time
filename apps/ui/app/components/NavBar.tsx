import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';

export function NavBar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}>
        <span className="flex items-center justify-center h-7 w-7 rounded-full border border-zinc-900">
          <img src="/logo.svg" alt="One Step at a Time" className="h-5 w-5" />
        </span>
      </button>
      <div className="absolute top-full left-0 mt-2">
        <div
          className={`overflow-hidden transition-[width] duration-200 ${open ? 'w-36' : 'w-0'}`}
        >
          <div
            className={`overflow-hidden transition-[max-height] duration-200 delay-200 ${open ? 'max-h-40' : 'max-h-0'}`}
          >
            <div className="bg-white border border-zinc-200 rounded-md shadow-sm py-1">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Home
              </Link>
              <Link
                to="/sample"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Sample
              </Link>
              <Link
                to="/standalone"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Standalone
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
