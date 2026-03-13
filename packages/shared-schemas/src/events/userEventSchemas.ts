/**
 * User Socket Event Schemas
 *
 * WebSocket payload contracts for real-time user management notifications.
 */

import { z } from 'zod';

export const userEventSchemas = {
  user_approved: z.object({
    userId: z.string(),
    username: z.string(),
    approvedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_deleted: z.object({
    userId: z.string(),
    username: z.string(),
    deletedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_role_changed: z.object({
    userId: z.string(),
    username: z.string(),
    oldRole: z.string(),
    newRole: z.string(),
    changedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_created: z.object({
    userId: z.string(),
    username: z.string(),
    role: z.string(),
    updatedAt: z.string(),
  }),
  user_linked_to_researcher: z.object({
    userId: z.string(),
    username: z.string(),
    researcherId: z.string(),
    researcherName: z.string(),
    linkedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_unlinked_from_researcher: z.object({
    userId: z.string(),
    username: z.string(),
    researcherId: z.string(),
    researcherName: z.string(),
    unlinkedBy: z.string(),
    updatedAt: z.string(),
  }),
} as const;
