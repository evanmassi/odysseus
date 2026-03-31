/**
 * Tube Socket Event Schemas
 *
 * WebSocket payload contracts for real-time tube change notifications.
 */

import { z } from 'zod';

const locationSchema = z.object({
  tankId: z.string(),
  rackId: z.string(),
  boxId: z.string(),
  position: z.number(),
});

export const tubeEventSchemas = {
  tube_created: z.object({
    tubeId: z.string(),
    location: locationSchema,
    createdBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_updated: z.object({
    tubeId: z.string(),
    oldLocation: locationSchema,
    newLocation: locationSchema,
    updatedBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_deleted: z.object({
    tubeId: z.string(),
    location: locationSchema,
    deletedBy: z.string(),
    updatedAt: z.string(),
  }),

  tubes_bulk_created: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    operation: z.string(),
    createdBy: z.string(),
    createdAt: z.string(),
  }),

  tubes_bulk_updated: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    operation: z.string(),
    changesSummary: z.record(z.string(), z.unknown()).optional(),
    updatedBy: z.string(),
    updatedAt: z.string(),
  }),

  tubes_bulk_deleted: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    operation: z.string(),
    deletedBy: z.string(),
    deletedAt: z.string(),
  }),

  tubes_locked: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    lockedBy: z.string(),
    lockNote: z.string().optional(),
    updatedAt: z.string(),
  }),

  tubes_unlocked: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    unlockedBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_access_shared: z.object({
    tubeIds: z.array(z.string()),
    addedUserIds: z.array(z.string()),
    tubeSharedUsers: z.array(
      z.object({
        tubeId: z.string(),
        sharedWithUserIds: z.array(z.string()),
      })
    ),
    sharedBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_access_revoked: z.object({
    tubeIds: z.array(z.string()),
    revokedUserIds: z.array(z.string()),
    tubeSharedUsers: z.array(
      z.object({
        tubeId: z.string(),
        sharedWithUserIds: z.array(z.string()),
      })
    ),
    revokedBy: z.string(),
    updatedAt: z.string(),
  }),
} as const;
