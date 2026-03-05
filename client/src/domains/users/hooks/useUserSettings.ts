/**
 * User Settings Hooks
 *
 * React Query hooks for fetching and mutating user preferences.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { userSettingsService } from '@domains/users/services/UserSettingsService';

import type {
  UserSettings,
  PositionDisplayPreference,
  ThemePreference,
} from '@odysseus/shared-schemas';

export function useUserSettingsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users.settings(),
    queryFn: () => userSettingsService.getUserSettings(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
    meta: {
      errorMessage: 'Failed to load user settings',
    },
  });
}

export function useUpdateUserSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UserSettings) => userSettingsService.updateUserSettings(settings),
    onSuccess: updatedSettings => {
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
    },
    meta: {
      errorMessage: 'Failed to update user settings',
    },
  });
}

export function useUpdatePositionDisplayPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preference: PositionDisplayPreference) =>
      userSettingsService.updatePositionDisplayPreference(preference),
    onSuccess: updatedSettings => {
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
    },
    meta: {
      errorMessage: 'Failed to update position display preference',
    },
  });
}

export function useUpdateThemePreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (theme: ThemePreference) => userSettingsService.updateThemePreference(theme),
    onSuccess: updatedSettings => {
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
    },
    meta: {
      errorMessage: 'Failed to update theme preference',
    },
  });
}

export function useUserSettings() {
  const { data: settings, isLoading, error } = useUserSettingsQuery();

  return {
    settings: settings ?? null,
    defaultPositionDisplay: settings?.defaultPositionDisplay ?? null,
    // 'auto' = follow system theme; fallback when user has no saved preference
    theme: settings?.theme ?? 'auto',
    isLoading,
    error,
    hasSettings: !!settings,
  };
}

export function useUserSettingsActions() {
  const updateSettingsMutation = useUpdateUserSettingsMutation();
  const updatePositionDisplayMutation = useUpdatePositionDisplayPreferenceMutation();
  const updateThemeMutation = useUpdateThemePreferenceMutation();

  return {
    updateSettings: updateSettingsMutation.mutate,
    updatePositionDisplay: updatePositionDisplayMutation.mutate,
    updateTheme: updateThemeMutation.mutate,

    updateSettingsAsync: updateSettingsMutation.mutateAsync,
    updatePositionDisplayAsync: updatePositionDisplayMutation.mutateAsync,
    updateThemeAsync: updateThemeMutation.mutateAsync,

    isUpdatingSettings: updateSettingsMutation.isPending,
    isUpdatingPositionDisplay: updatePositionDisplayMutation.isPending,
    isUpdatingTheme: updateThemeMutation.isPending,
    isSaving:
      updateSettingsMutation.isPending ||
      updatePositionDisplayMutation.isPending ||
      updateThemeMutation.isPending,

    updateSettingsError: updateSettingsMutation.error,
    updatePositionDisplayError: updatePositionDisplayMutation.error,
    updateThemeError: updateThemeMutation.error,

    resetUpdateSettingsError: updateSettingsMutation.reset,
    resetUpdatePositionDisplayError: updatePositionDisplayMutation.reset,
    resetUpdateThemeError: updateThemeMutation.reset,
  };
}
