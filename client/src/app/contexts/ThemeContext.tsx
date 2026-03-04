/**
 * Theme Context
 *
 * Provides theme state management for the application.
 * Supports light, dark, and auto (system preference) modes.
 *
 * The theme is persisted in two places:
 * 1. Cookie (for immediate access on page load, survives most "clear data" operations)
 * 2. Server (authoritative source, syncs across devices)
 */
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import type { ThemePreference } from '@odysseus/shared-schemas';

/**
 * Resolved theme - the actual theme being displayed (never 'auto')
 */
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  systemPreference: ResolvedTheme;
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
  initialPreference?: ThemePreference;
  /** Callback when preference changes (for syncing to server) */
  onPreferenceChange?: (preference: ThemePreference) => void;
}

export function ThemeProvider({
  children,
  initialPreference,
  onPreferenceChange,
}: ThemeProviderProps) {
  const getInitialPreference = (): ThemePreference => {
    if (initialPreference) {
      return initialPreference;
    }
    const cookieValue = getCookie(THEME_COOKIE_NAME);
    if (cookieValue === 'light' || cookieValue === 'dark' || cookieValue === 'auto') {
      return cookieValue;
    }
    return 'auto';
  };

  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(getSystemPreference);

  const theme = resolveTheme(preference, systemPreference);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes
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

  // Sync preference from server when it changes
  useEffect(() => {
    if (initialPreference) {
      setPreferenceState(initialPreference);
      setThemeCookie(initialPreference);
    }
  }, [initialPreference]);

  const setPreference = useCallback(
    (newPreference: ThemePreference) => {
      setPreferenceState(newPreference);
      setThemeCookie(newPreference);
      onPreferenceChange?.(newPreference);
    },
    [onPreferenceChange]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setPreference,
      systemPreference,
    }),
    [theme, preference, setPreference, systemPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 *
 * @throws Error if used outside of ThemeProvider
 */
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
