/**
 * User Settings React Query Hooks
 *
 * Clean data fetching hooks for user preferences and settings.
 * Provides proper loading states, error handling, and caching.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { userSettingsService } from '@domains/users/services/UserSettingsService';

import type {
  UserSettings,
  PositionDisplayPreference,
  ThemePreference,
} from '@odysseus/shared-schemas';

/**
 * Query hook for user settings
 *
 * Fetches the current user's settings from the server.
 * Settings include display preferences, theme, language, etc.
 *
 * @param options - Query options (e.g., { enabled: isAuthenticated })
 */
export function useUserSettingsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users.settings(),
    queryFn: () => userSettingsService.getUserSettings(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    enabled: options?.enabled ?? true, // Default to enabled unless explicitly disabled
    meta: {
      errorMessage: 'Failed to load user settings',
    },
  });
}

/**
 * Mutation hook for updating user settings (full update)
 *
 * Updates all user settings at once. Use this for bulk updates
 * or when updating multiple settings fields together.
 */
export function useUpdateUserSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UserSettings) => userSettingsService.updateUserSettings(settings),
    onSuccess: updatedSettings => {
      // Update the settings cache with new data
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
    },
    meta: {
      errorMessage: 'Failed to update user settings',
    },
  });
}

/**
 * Mutation hook for updating position display preference
 *
 * Convenience hook for updating only the position display preference.
 * This is the most common settings update operation.
 */
export function useUpdatePositionDisplayPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preference: PositionDisplayPreference) =>
      userSettingsService.updatePositionDisplayPreference(preference),
    onSuccess: updatedSettings => {
      // Update the settings cache with new data
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
    },
    meta: {
      errorMessage: 'Failed to update position display preference',
    },
  });
}

/**
 * Mutation hook for updating theme preference
 *
 * Convenience hook for updating only the theme preference.
 * Also handles cookie persistence for flash prevention.
 */
export function useUpdateThemePreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (theme: ThemePreference) => userSettingsService.updateThemePreference(theme),
    onSuccess: updatedSettings => {
      // Update the settings cache with new data
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
    },
    meta: {
      errorMessage: 'Failed to update theme preference',
    },
  });
}

/**
 * Derived state hook for UI components
 *
 * Provides convenient access to user settings state and loading indicators.
 * Use this in components that need read-only access to settings.
 */
export function useUserSettings() {
  const { data: settings, isLoading, error } = useUserSettingsQuery();

  return {
    // Settings data
    settings: settings ?? null,
    defaultPositionDisplay: settings?.defaultPositionDisplay ?? null,
    theme: settings?.theme ?? 'auto',

    // Loading states
    isLoading,

    // Error state
    error,

    // Derived states
    hasSettings: !!settings,
  };
}

/**
 * Hook for user settings actions (mutations)
 *
 * Provides functions for updating user settings.
 * Use this in components that need to modify settings.
 */
export function useUserSettingsActions() {
  const updateSettingsMutation = useUpdateUserSettingsMutation();
  const updatePositionDisplayMutation = useUpdatePositionDisplayPreferenceMutation();
  const updateThemeMutation = useUpdateThemePreferenceMutation();

  return {
    // Mutation functions
    updateSettings: updateSettingsMutation.mutate,
    updatePositionDisplay: updatePositionDisplayMutation.mutate,
    updateTheme: updateThemeMutation.mutate,

    // Async versions (return promises)
    updateSettingsAsync: updateSettingsMutation.mutateAsync,
    updatePositionDisplayAsync: updatePositionDisplayMutation.mutateAsync,
    updateThemeAsync: updateThemeMutation.mutateAsync,

    // Loading states
    isUpdatingSettings: updateSettingsMutation.isPending,
    isUpdatingPositionDisplay: updatePositionDisplayMutation.isPending,
    isUpdatingTheme: updateThemeMutation.isPending,
    isSaving:
      updateSettingsMutation.isPending ||
      updatePositionDisplayMutation.isPending ||
      updateThemeMutation.isPending,

    // Error states
    updateSettingsError: updateSettingsMutation.error,
    updatePositionDisplayError: updatePositionDisplayMutation.error,
    updateThemeError: updateThemeMutation.error,

    // Reset functions
    resetUpdateSettingsError: updateSettingsMutation.reset,
    resetUpdatePositionDisplayError: updatePositionDisplayMutation.reset,
    resetUpdateThemeError: updateThemeMutation.reset,
  };
}
