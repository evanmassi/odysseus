/**
 * Lab & Invite Code Schemas
 *
 * Multi-tenancy schemas for lab management and invite code operations.
 */

import { z } from 'zod';

export const labDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  isDemo: z.boolean(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
});

export type LabData = z.infer<typeof labDataSchema>;

export const labPublicDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  isDemo: z.boolean(),
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
  status: z.enum(['pending', 'approved', 'rejected']),
  isDemo: z.boolean(),
  lastActivity: z.string(),
  researcher: z.object({
    name: z.string(),
    tubeCount: z.number(),
  }).nullable(),
});

export type LabDetailsUser = z.infer<typeof labDetailsUserSchema>;

export const labDetailsSchema = z.object({
  lab: labDataSchema,
  users: z.array(labDetailsUserSchema),
  researcherCount: z.number(),
  tubeCount: z.number(),
  storageSummary: z.object({
    tankCount: z.number(),
    rackCount: z.number(),
    boxCount: z.number(),
  }),
});

export type LabDetails = z.infer<typeof labDetailsSchema>;

export const createInviteCodeRequestSchema = z.object({
  role: z.enum(['lab_admin', 'user']).optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export type CreateInviteCodeRequest = z.infer<typeof createInviteCodeRequestSchema>;
