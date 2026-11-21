import { useEffect, useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const listeners = new Set<() => void>();
// Fallback when storage is unavailable (private mode, blocked site data).
let memoryPreference: ThemePreference = 'system';

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return memoryPreference;
  }
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function setPreference(preference: ThemePreference) {
  memoryPreference = preference;
  try {
    if (preference === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    // Kept in `memoryPreference` instead.
  }
  applyTheme(preference);
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/**
 * Inlined into <head> so `data-theme` is set before first paint, mirroring
 * `readPreference` + `applyTheme`. The hook never applies the stored theme on
 * mount, so the prerendered shell's `'system'` snapshot can't override it.
 */
export const THEME_INIT_SCRIPT = `(function(){var p;try{p=localStorage.getItem('${STORAGE_KEY}');}catch(e){}var d=p==='dark'||(p!=='light'&&window.matchMedia('${DARK_QUERY}').matches);document.documentElement.dataset.theme=d?'dark':'light';})();`;

export function useTheme() {
  const preference = useSyncExternalStore(
    subscribe,
    readPreference,
    () => 'system' as const
  );

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (readPreference() === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return { preference, setPreference };
}
