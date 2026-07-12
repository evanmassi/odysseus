/**
 * Tube Lock and Access Operations
 *
 * Schemas for bulk locking, unlocking, and shared access grant/revoke requests and results.
 */

import { z } from 'zod';

export const lockTubesRequestSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1).max(100),
  lockNote: z.string().max(100).optional(),
});

export const unlockTubesRequestSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1).max(100),
});

/**
 * Share tube access request schema
 * Grant access to locked tubes for specific users
 */
export const shareTubeAccessRequestSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1),
  userIds: z.array(z.string().min(1)).min(1),
});

/**
 * Revoke tube access request schema
 * Remove shared access from locked tubes
 */
export const revokeTubeAccessRequestSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1),
  userIds: z.array(z.string().min(1)).min(1),
});

/**
 * Skipped tube info for partial success responses
 */
const skippedTubeSchema = z.object({
  tubeId: z.string(),
  reason: z.string(),
});

/** Supports partial success pattern. */
export const bulkLockResultSchema = z.object({
  locked: z.array(z.string()),
  skipped: z.array(skippedTubeSchema),
});

/** Supports partial success pattern. */
export const bulkUnlockResultSchema = z.object({
  unlocked: z.array(z.string()),
  skipped: z.array(skippedTubeSchema),
});

export const shareAccessResultSchema = z.object({
  shared: z.array(z.string()),
  skipped: z.array(skippedTubeSchema),
});

export const revokeAccessResultSchema = z.object({
  revoked: z.array(z.string()),
  skipped: z.array(skippedTubeSchema),
});

// Request types
export type LockTubesRequest = z.infer<typeof lockTubesRequestSchema>;
export type UnlockTubesRequest = z.infer<typeof unlockTubesRequestSchema>;
export type ShareTubeAccessRequest = z.infer<typeof shareTubeAccessRequestSchema>;
export type RevokeTubeAccessRequest = z.infer<typeof revokeTubeAccessRequestSchema>;

// Result types
export type SkippedTube = z.infer<typeof skippedTubeSchema>;
export type BulkLockResult = z.infer<typeof bulkLockResultSchema>;
export type BulkUnlockResult = z.infer<typeof bulkUnlockResultSchema>;
export type ShareAccessResult = z.infer<typeof shareAccessResultSchema>;
export type RevokeAccessResult = z.infer<typeof revokeAccessResultSchema>;
