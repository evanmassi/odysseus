/**
 * Tube Lock Mutation Hooks
 *
 * React Query hooks for tube locking operations.
 */

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { TubeService } from '@domains/tubes/services/TubeService';
import { logger } from '@infra/logger';

import type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest,
  BulkLockResult,
  BulkUnlockResult,
  ShareAccessResult,
  RevokeAccessResult,
} from '@odysseus/shared-schemas';

/** Partial success pattern — returns locked tubeIds and skipped tubes with reasons. */
export const useLockTubesMutation = (
  options: UseMutationOptions<BulkLockResult, Error, LockTubesRequest> = {}
) => {
  const labId = useLabId();

  return useMutation({
    mutationFn: async (request: LockTubesRequest) => {
      return await TubeService.lockTubes(request);
    },

    meta: { invalidates: [queryKeys.tubes.all(labId)] },

    onError: error => {
      logger.error('Failed to lock tubes', { error });
    },

    ...options,
  });
};

/** Partial success pattern — returns unlocked tubeIds and skipped tubes with reasons. */
export const useUnlockTubesMutation = (
  options: UseMutationOptions<BulkUnlockResult, Error, UnlockTubesRequest> = {}
) => {
  const labId = useLabId();

  return useMutation({
    mutationFn: async (request: UnlockTubesRequest) => {
      return await TubeService.unlockTubes(request);
    },

    meta: { invalidates: [queryKeys.tubes.all(labId)] },

    onError: error => {
      logger.error('Failed to unlock tubes', { error });
    },

    ...options,
  });
};

/** Partial success pattern — returns shared tubeIds and skipped tubes with reasons. */
export const useShareTubeAccessMutation = (
  options: UseMutationOptions<ShareAccessResult, Error, ShareTubeAccessRequest> = {}
) => {
  const labId = useLabId();

  return useMutation({
    mutationFn: async (request: ShareTubeAccessRequest) => {
      return await TubeService.shareTubeAccess(request);
    },

    meta: { invalidates: [queryKeys.tubes.all(labId)] },

    onError: error => {
      logger.error('Failed to share tube access', { error });
    },

    ...options,
  });
};

/** Partial success pattern — returns revoked tubeIds and skipped tubes with reasons. */
export const useRevokeTubeAccessMutation = (
  options: UseMutationOptions<RevokeAccessResult, Error, RevokeTubeAccessRequest> = {}
) => {
  const labId = useLabId();

  return useMutation({
    mutationFn: async (request: RevokeTubeAccessRequest) => {
      return await TubeService.revokeTubeAccess(request);
    },

    meta: { invalidates: [queryKeys.tubes.all(labId)] },

    onError: error => {
      logger.error('Failed to revoke tube access', { error });
    },

    ...options,
  });
};
