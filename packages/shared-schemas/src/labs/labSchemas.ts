/**
 * Lab & Invite Code Schemas
 *
 * Multi-tenancy schemas for lab management and invite code operations.
 */

import { z } from 'zod';
import { DemoLimitsSchema } from '../demo/demoSchemas';

export const labDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  isDemo: z.boolean(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
  demoLimits: DemoLimitsSchema.optional(),
  isSeeded: z.boolean().optional(),
});

export type LabData = z.infer<typeof labDataSchema>;

export const labPublicDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  isDemo: z.boolean(),
  demoLimits: DemoLimitsSchema.optional(),
});

export type LabPublicData = z.infer<typeof labPublicDataSchema>;

export const inviteCodeDataSchema = z.object({
  id: z.string(),
  labId: z.string(),
  code: z.string(),
  role: z.enum(['lab_admin', 'user']),
  createdBy: z.string(),
  maxUses: z.number().int().positive().optional(),
  useCount: z.number().int().min(0),
  expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
  isActive: z.boolean(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  deactivationReason: z.enum(['used', 'expired', 'manual']).optional(),
});

export type InviteCodeData = z.infer<typeof inviteCodeDataSchema>;

export const createLabRequestSchema = z.object({
  name: z.string()
    .min(1, 'Lab name is required')
    .max(200, 'Lab name cannot exceed 200 characters')
    .transform(val => val.trim()),
  isDemo: z.boolean().optional().default(false),
});

export type CreateLabRequest = z.infer<typeof createLabRequestSchema>;

export const labDetailsUserSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.enum(['system_admin', 'lab_admin', 'user']),
  status: z.enum(['pending', 'approved', 'rejected', 'deactivated', 'suspended']),
  isDemo: z.boolean(),
  lastActivity: z.string(),
  researcher: z.object({
    name: z.string(),
    tubeCount: z.number(),
  }).nullable(),
});

export type LabDetailsUser = z.infer<typeof labDetailsUserSchema>;

export const labDetailsResearcherSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  tubeCount: z.number(),
  linkedUser: z.object({
    id: z.string(),
    username: z.string(),
  }).nullable(),
});

export type LabDetailsResearcher = z.infer<typeof labDetailsResearcherSchema>;

export const labDetailsSchema = z.object({
  lab: labDataSchema,
  users: z.array(labDetailsUserSchema),
  researchers: z.array(labDetailsResearcherSchema),
  researcherCount: z.number(),
  tubeCount: z.number(),
  storageSummary: z.object({
    tankCount: z.number(),
    rackCount: z.number(),
    boxCount: z.number(),
  }),
  isSeeded: z.boolean(),
});

export type LabDetails = z.infer<typeof labDetailsSchema>;

export const createInviteCodeRequestSchema = z.object({
  role: z.enum(['lab_admin', 'user']).optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export type CreateInviteCodeRequest = z.infer<typeof createInviteCodeRequestSchema>;
