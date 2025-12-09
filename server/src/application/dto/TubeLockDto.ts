/**
 * Tube Lock DTOs
 *
 * Thin DTOs for lock/unlock operations.
 * Re-exports types from shared-schemas.
 */

import {
  type LockTubesRequest,
  type UnlockTubesRequest,
  type ShareTubeAccessRequest,
  type RevokeTubeAccessRequest,
  type BatchLockResult,
  type BatchUnlockResult,
  type ShareAccessResult,
  type RevokeAccessResult,
  type SkippedTube
} from '@odysseus/shared-schemas';

// Re-export request types
export type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest
};

// Re-export result types
export type {
  BatchLockResult,
  BatchUnlockResult,
  ShareAccessResult,
  RevokeAccessResult,
  SkippedTube
};

// Response types match result types
export type LockTubesResponse = BatchLockResult;
export type UnlockTubesResponse = BatchUnlockResult;
export type ShareAccessResponse = ShareAccessResult;
export type RevokeAccessResponse = RevokeAccessResult;
