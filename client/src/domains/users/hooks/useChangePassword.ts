/**
 * Password Change React Query Hook
 *
 * Hook for changing authenticated user's password.
 */
import { useMutation } from '@tanstack/react-query';

import { UserPasswordService } from '../services/UserPasswordService';

interface ChangePasswordVariables {
  currentPassword: string;
  newPassword: string;
}

/**
 * Mutation hook for changing password
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordVariables) =>
      UserPasswordService.changePassword(currentPassword, newPassword),
    meta: {
      errorMessage: 'Failed to change password',
    },
  });
}

/**
 * Hook for password change actions
 */
export function useChangePassword() {
  const mutation = useChangePasswordMutation();

  return {
    changePassword: mutation.mutate,
    changePasswordAsync: mutation.mutateAsync,
    isChanging: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
