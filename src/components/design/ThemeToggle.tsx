'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'dark' | 'light';

// The no-flash script in the root layout owns data-theme. We subscribe to its
// value with an external store so SSR and the first client render agree
// (server snapshot = dark), then it re-renders once mounted with the real value.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function getServerSnapshot(): Theme {
  return 'dark';
}

/**
 * A plain two-state control. Writes the choice to localStorage and mirrors it
 * onto <html data-theme>; the no-flash script in the root layout reads the
 * same key before paint.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('voxelle-theme', next);
    } catch {
      // Storage may be unavailable; the in-memory switch still applies.
    }
  }, []);

  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-control)] border border-line text-muted hover:text-text hover:bg-raised transition-colors cursor-pointer ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
    </button>
  );
}
