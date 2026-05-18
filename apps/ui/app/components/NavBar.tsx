import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

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
    <nav ref={ref} className="relative z-0">
      <button onClick={() => setOpen((o) => !o)} className="relative z-10">
        <span className="flex items-center justify-center h-7 w-7 rounded-full border border-zinc-900">
          <img src="/logo.svg" alt="One Step at a Time" className="h-5 w-5" />
        </span>
      </button>
      <div className="absolute top-0 left-0 z-1">
        <div
          className={`overflow-hidden transition-[width,max-height] duration-200 ${
            open ? 'w-36 max-h-40' : 'w-0 max-h-7'
          }`}
          style={
            open
              ? { transitionDelay: '0ms, 200ms' }
              : { transitionDelay: '0ms, 0ms' }
          }
        >
          <div className="bg-white border border-zinc-200 rounded-tl-2xl rounded-tr-md rounded-br-md rounded-bl-md shadow-sm">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="h-7 flex items-center pl-8 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Home
            </Link>
            <Link
              to="/sample"
              onClick={() => setOpen(false)}
              className="h-7 flex items-center pl-8 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Sample
            </Link>
            <Link
              to="/standalone"
              onClick={() => setOpen(false)}
              className="h-7 flex items-center pl-8 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Standalone
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
