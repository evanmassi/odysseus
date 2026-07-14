/**
 * Researcher Domain Schemas
 *
 * Pure domain entities for researcher profiles with no auth concerns.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';

const researcherSourceSchema = z.enum(['registration', 'admin']);

export const researcherSchema = z.object({
  id: z.string(),
  personId: z.string(),
  active: z.boolean(),
  createdAt: dateField,
  source: researcherSourceSchema.optional().default('admin'),
  // Denormalized Person fields for display
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  labId: z.string().optional(),
});

export const createResearcherProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  position: z.string().max(100, 'Position too long').optional(),
  department: z.string().max(100, 'Department too long').optional(),
  email: z.string().min(1, 'Email is required').email('Invalid email format')
});

export type Researcher = z.infer<typeof researcherSchema>;
export type CreateResearcherProfile = z.infer<typeof createResearcherProfileSchema>;

/**
 * Extended researcher view with admin metadata.
 */
export const adminResearcherSchema = researcherSchema.extend({
  source: researcherSourceSchema,

  // Admin metadata
  tubeCount: z.number().int().min(0),
  linkedUserId: z.string().optional(),
  linkedUsername: z.string().optional(),
  linkedUserStatus: z.string().optional(),
});

export type AdminResearcher = z.infer<typeof adminResearcherSchema>;
