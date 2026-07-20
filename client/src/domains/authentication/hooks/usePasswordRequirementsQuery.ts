/**
 * Password Requirements Query
 *
 * Loads the public password policy for live validation in password-entry forms.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { MS_PER_MINUTE } from '@shared/utils';

import { authService } from '../services/AuthService';

export function usePasswordRequirementsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.auth.passwordRequirements(),
    queryFn: () => authService.getPasswordRequirements(),
    staleTime: 5 * MS_PER_MINUTE,
    enabled: options?.enabled ?? true,
  });
}
