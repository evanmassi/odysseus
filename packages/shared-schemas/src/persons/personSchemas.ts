/**
 * Person Domain Schemas
 *
 * Person is the single source of truth for profile data.
 * Users and Researchers reference Person via personId.
 */

import { z } from 'zod';

/**
 * Person Domain Entity
 *
 * Core profile entity containing name, email, and organizational data.
 * Referenced by User and Researcher entities.
 */
export const personSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  position: z.string().optional(),
  department: z.string().optional(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()])
});

export type Person = z.infer<typeof personSchema>;

/**
 * Person Update Schema
 *
 * Input for updating person profiles
 * All fields optional for partial updates
 */
export const updatePersonProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(50, 'Last name too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  position: z.string().max(100, 'Position too long').optional(),
  department: z.string().max(100, 'Department too long').optional()
});

export type UpdatePersonProfile = z.infer<typeof updatePersonProfileSchema>;

/**
 * Person Profile Response Schema
 *
 * API response for person profile queries
 */
export const personProfileResponseSchema = z.object({
  success: z.boolean(),
  data: personSchema
});

export type PersonProfileResponse = z.infer<typeof personProfileResponseSchema>;
