import { ThemePreference, useTheme } from '@/hooks/useTheme';
import { Link } from '@tanstack/react-router';
import { MouseEventHandler, useEffect, useRef, useState } from 'react';

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
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative z-10 cursor-pointer"
      >
        <span className="flex items-center justify-center h-7 w-7 rounded-full border border-fg">
          <img
            src="/logo.svg"
            alt="One Step at a Time"
            className="h-5 w-5 dark:invert dark:hue-rotate-180"
          />
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
          <div className="bg-surface border border-line rounded-tl-2xl rounded-tr-md rounded-br-md rounded-bl-md shadow-sm">
            <NavLink to="/" onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/sample" onClick={() => setOpen(false)}>
              Sample
            </NavLink>
            <NavLink to="/standalone" onClick={() => setOpen(false)}>
              Standalone
            </NavLink>
            <ThemePicker />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: MouseEventHandler<HTMLAnchorElement> | undefined;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="h-7 flex items-center pl-8 text-sm text-fg hover:bg-surface-hover"
    >
      {children}
    </Link>
  );
}

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'system',
    label: 'System theme',
    icon: (
      <>
        <rect x="2" y="3" width="12" height="8" rx="1" />
        <path d="M6 14h4M8 11v3" />
      </>
    ),
  },
  {
    value: 'light',
    label: 'Light theme',
    icon: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" />
      </>
    ),
  },
  {
    value: 'dark',
    label: 'Dark theme',
    icon: <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />,
  },
];

function ThemePicker() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex gap-1 border-t border-line px-2 py-1.5"
    >
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={preference === option.value}
          title={option.label}
          onClick={() => setPreference(option.value)}
          className="flex flex-1 items-center justify-center rounded py-1 text-fg-muted hover:bg-surface-hover hover:text-fg cursor-pointer aria-pressed:bg-surface-hover aria-pressed:text-accent"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {option.icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
