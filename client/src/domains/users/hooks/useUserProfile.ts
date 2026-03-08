/**
 * User Profile React Query Hooks
 *
 * Hooks for fetching and updating user profile data.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { PersonService, type UpdatePersonProfileWithPassword } from '../services/PersonService';

import type { Person } from '@odysseus/shared-schemas';

function useUserProfileQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => PersonService.getMyProfile(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
    meta: {
      errorMessage: 'Failed to load profile',
    },
  });
}

function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePersonProfileWithPassword) => PersonService.updateMyProfile(data),
    onSuccess: (updatedProfile: Person) => {
      queryClient.setQueryData(queryKeys.users.profile(), updatedProfile);
    },
    meta: {
      errorMessage: 'Failed to update profile',
    },
  });
}

export function useUserProfile() {
  const { data: profile, isLoading, error } = useUserProfileQuery();

  return {
    profile,
    isLoading,
    error,
    hasProfile: !!profile,
  };
}

export function useUserProfileActions() {
  const updateProfileMutation = useUpdateUserProfileMutation();

  return {
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    updateError: updateProfileMutation.error,
    resetError: updateProfileMutation.reset,
  };
}
