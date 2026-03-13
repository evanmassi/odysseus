/**
 * Researcher Socket Event Schemas
 *
 * WebSocket payload contracts for real-time researcher change notifications.
 */

import { z } from 'zod';

const researcherEventSchema = z.object({
  researcherId: z.string(),
  eventType: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  position: z.string().optional(),
});

const researcherDeletedSchema = z.object({
  researcherId: z.string(),
  eventType: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  deletedBy: z.string(),
  updatedAt: z.string(),
});

export const researcherEventSchemas = {
  researcher_created: researcherEventSchema,
  researcher_updated: researcherEventSchema,
  researcher_deactivated: researcherEventSchema,
  researcher_reactivated: researcherEventSchema,
  researcher_deleted: researcherDeletedSchema,
} as const;
