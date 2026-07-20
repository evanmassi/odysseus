/**
 * Admin Security Config Mutation
 *
 * Persists changes to the global security configuration (system-admin only).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { adminService } from '../services/AdminService';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export function useUpdateSecurityConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: Partial<SecurityConfig>) => adminService.updateSecurityConfig(changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.securityConfig() });
    },
  });
}
