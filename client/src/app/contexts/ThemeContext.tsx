/**
 * Theme Context
 *
 * Owns the active light/dark/auto theme and persists it to a cookie for instant paint
 * on next load. The authoritative server preference is reconciled by useServerThemeSync.
 */
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import { themePreferenceSchema } from '@odysseus/shared-schemas';

import type { ThemePreference, ResolvedTheme } from '@odysseus/shared-schemas';

interface ThemeContextValue {
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_COOKIE_NAME = 'odysseus-theme';
const COOKIE_EXPIRY_YEARS = 1;

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setThemeCookie(theme: ThemePreference): void {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + COOKIE_EXPIRY_YEARS);
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function getSystemPreference(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function resolveTheme(preference: ThemePreference, systemPreference: ResolvedTheme): ResolvedTheme {
  if (preference === 'auto') {
    return systemPreference;
  }
  return preference;
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const getInitialPreference = (): ThemePreference => {
    const parsed = themePreferenceSchema.safeParse(getCookie(THEME_COOKIE_NAME));
    return parsed.success ? parsed.data : 'auto';
  };

  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(getSystemPreference);

  const theme = resolveTheme(preference, systemPreference);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches ? 'dark' : 'light');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const setPreference = useCallback((newPreference: ThemePreference) => {
    setPreferenceState(newPreference);
    setThemeCookie(newPreference);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ setPreference }), [setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** @throws if used outside a ThemeProvider */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
        'Wrap your app with ThemeProvider to use this hook.'
    );
  }

  return context;
}
