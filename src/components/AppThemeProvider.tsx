'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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

export function AppThemeProvider({children}: {children: ReactNode}) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate client-only theme preference after mount
    setModeState(readStoredMode());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable; in-memory state still updates.
    }
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
