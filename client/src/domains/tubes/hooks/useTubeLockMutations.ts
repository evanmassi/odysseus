/**
 * Tube Lock Mutation Hooks
 *
 * React Query hooks for tube locking operations.
 *
 * - Uses TubeService lock methods
 * - Smart cache invalidation
 * - Consistent error handling
 */

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { TubeService } from '@domains/tubes/services/TubeService';
import { logger } from '@shared/infrastructure/logger';

import type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest,
  BatchLockResult,
  BatchUnlockResult,
  ShareAccessResult,
  RevokeAccessResult,
} from '@odysseus/shared-schemas';

/**
 * Lock tubes mutation
 *
 * Batch locks tubes with partial success pattern.
 * Returns locked tubeIds and skipped tubes with reasons.
 */
export const useLockTubesMutation = (
  options: UseMutationOptions<BatchLockResult, Error, LockTubesRequest> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: LockTubesRequest) => {
      return await TubeService.lockTubes(request);
    },

    onSuccess: () => {
      // Invalidate all tube queries to refetch with lock state
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },

    onError: error => {
      logger.error('Failed to lock tubes', { error });
    },

    ...options,
  });
};

/**
 * Unlock tubes mutation
 *
 * Batch unlocks tubes with partial success pattern.
 * Returns unlocked tubeIds and skipped tubes with reasons.
 */
export const useUnlockTubesMutation = (
  options: UseMutationOptions<BatchUnlockResult, Error, UnlockTubesRequest> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UnlockTubesRequest) => {
      return await TubeService.unlockTubes(request);
    },

    onSuccess: () => {
      // Invalidate all tube queries to refetch with lock state
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },

    onError: error => {
      logger.error('Failed to unlock tubes', { error });
    },

    ...options,
  });
};

/**
 * Share tube access mutation
 *
 * Shares access to locked tubes with specified users.
 * Returns shared tubeIds and skipped tubes with reasons.
 */
export const useShareTubeAccessMutation = (
  options: UseMutationOptions<ShareAccessResult, Error, ShareTubeAccessRequest> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ShareTubeAccessRequest) => {
      return await TubeService.shareTubeAccess(request);
    },

    onSuccess: () => {
      // Invalidate all tube queries to refetch with updated sharing
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },

    onError: error => {
      logger.error('Failed to share tube access', { error });
    },

    ...options,
  });
};

/**
 * Revoke tube access mutation
 *
 * Revokes access to locked tubes from specified users.
 * Returns revoked tubeIds and skipped tubes with reasons.
 */
export const useRevokeTubeAccessMutation = (
  options: UseMutationOptions<RevokeAccessResult, Error, RevokeTubeAccessRequest> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RevokeTubeAccessRequest) => {
      return await TubeService.revokeTubeAccess(request);
    },

    onSuccess: () => {
      // Invalidate all tube queries to refetch with updated sharing
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },

    onError: error => {
      logger.error('Failed to revoke tube access', { error });
    },

    ...options,
  });
};
