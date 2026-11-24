'use client';

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from '../astryx-themes';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'voxelle-theme';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedDark: boolean;
}

const AppThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
  resolvedDark: true,
});

export function useAppTheme() {
  return useContext(AppThemeContext);
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // Storage may be unavailable; keep in-memory state.
  }
  return 'system';
}

let inMemoryMode: ThemeMode | null = null;
const modeListeners = new Set<() => void>();

function subscribeMode(listener: () => void): () => void {
  modeListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      inMemoryMode = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    modeListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getModeSnapshot(): ThemeMode {
  return inMemoryMode ?? readStoredMode();
}

function getModeServerSnapshot(): ThemeMode {
  return 'system';
}

function subscribePrefersDark(listener: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}

function getPrefersDarkSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getPrefersDarkServerSnapshot(): boolean {
  return true;
}

export function AppThemeProvider({children}: {children: ReactNode}) {
  const mode = useSyncExternalStore(
    subscribeMode,
    getModeSnapshot,
    getModeServerSnapshot
  );
  const systemPrefersDark = useSyncExternalStore(
    subscribePrefersDark,
    getPrefersDarkSnapshot,
    getPrefersDarkServerSnapshot
  );

  const setMode = useCallback((next: ThemeMode) => {
    inMemoryMode = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable; in-memory state still updates.
    }
    modeListeners.forEach((listener) => listener());
  }, []);

  const resolvedDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);

  const ctx = useMemo(
    () => ({mode, setMode, resolvedDark}),
    [mode, setMode, resolvedDark]
  );

  return (
    <AppThemeContext value={ctx}>
      <Theme theme={themes[defaultThemeSlug]} mode={mode}>
        {children}
      </Theme>
    </AppThemeContext>
  );
}
