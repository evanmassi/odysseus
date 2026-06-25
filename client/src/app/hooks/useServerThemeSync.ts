/**
 * Server Theme Sync
 *
 * Applies the authenticated user's saved theme once it loads, so the authoritative
 * server preference reconciles the cookie-based initial paint (e.g. on a fresh device).
 */
import { useEffect } from 'react';

import { useTheme } from '@app/contexts/ThemeContext';
import { useAuthStore } from '@domains/authentication';
import { useUserSettingsQuery } from '@domains/users/hooks/useUserSettings';

export function useServerThemeSync(): void {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { data: settings } = useUserSettingsQuery({ enabled: isAuthenticated });
  const { setPreference } = useTheme();

  useEffect(() => {
    if (settings?.theme) {
      setPreference(settings.theme);
    }
  }, [settings?.theme, setPreference]);
}
