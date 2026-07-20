/**
 * Admin System Settings Mutation
 *
 * Updates the lab display name via the dedicated system-settings endpoint (preserves equipment).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { StorageService } from '@domains/storage';

export function useUpdateSystemSettingsMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: (labName: string) => StorageService.updateSystemSettings(labName),
    onSuccess: () => {
      if (labId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      }
    },
  });
}
