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

function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordVariables) =>
      UserPasswordService.changePassword(currentPassword, newPassword),
    meta: {
      errorMessage: 'Failed to change password',
    },
  });
}

export function usePasswordChange() {
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
