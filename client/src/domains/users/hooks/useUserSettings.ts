/**
 * User Settings Hooks
 *
 * React Query hooks for fetching and mutating user preferences.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { MS_PER_MINUTE } from '@shared/utils';

import { UserSettingsService } from '../services/UserSettingsService';

import type { UserSettings } from '@odysseus/shared-schemas';

export function useUserSettingsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users.settings(),
    queryFn: () => UserSettingsService.getUserSettings(),
    staleTime: 5 * MS_PER_MINUTE,
    enabled: options?.enabled ?? true,
    meta: {
      errorMessage: 'Failed to load user settings',
    },
  });
}

function useUpdateUserSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UserSettings) => UserSettingsService.updateUserSettings(settings),
    onSuccess: updatedSettings => {
      queryClient.setQueryData(queryKeys.users.settings(), updatedSettings);
    },
    meta: {
      errorMessage: 'Failed to update user settings',
    },
  });
}

export function useUserSettings() {
  const { data: settings, isLoading } = useUserSettingsQuery();

  return {
    settings: settings ?? null,
    isLoading,
  };
}

export function useUserSettingsActions() {
  const updateSettingsMutation = useUpdateUserSettingsMutation();

  return {
    updateSettings: updateSettingsMutation.mutate,
    isSaving: updateSettingsMutation.isPending,
  };
}
