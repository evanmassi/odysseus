/**
 * Lab & Invite Code Schemas
 *
 * Multi-tenancy schemas for lab management and invite code operations.
 */

import { z } from 'zod';
import { USER_ROLES, USER_STATUSES } from '../auth/authSchemas';
import { demoLimitsSchema } from '../demo/demoSchemas';

export const labDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  isDemo: z.boolean(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
  demoLimits: demoLimitsSchema.optional(),
  isSeeded: z.boolean().optional(),
});

export type LabData = z.infer<typeof labDataSchema>;

export const labPublicDataSchema = labDataSchema.pick({
  id: true,
  name: true,
  slug: true,
  isActive: true,
  isDemo: true,
  demoLimits: true,
});

export type LabPublicData = z.infer<typeof labPublicDataSchema>;

export const inviteCodeDataSchema = z.object({
  id: z.string(),
  labId: z.string(),
  code: z.string(),
  role: z.enum(['lab_admin', 'user']),
  createResearcher: z.boolean(),
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
  role: z.enum(USER_ROLES),
  status: z.enum(USER_STATUSES),
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

const systemOverviewLabStatSchema = z.object({
  labId: z.string(),
  labName: z.string(),
  adminCount: z.number(),
  userCount: z.number(),
  researcherCount: z.number(),
  tubeCount: z.number(),
  tankCount: z.number(),
  rackCount: z.number(),
  boxCount: z.number(),
});

export type SystemOverviewLabStat = z.infer<typeof systemOverviewLabStatSchema>;

export const systemOverviewSchema = z.object({
  totalLabs: z.number(),
  activeLabs: z.number(),
  inactiveLabs: z.number(),
  totalUsers: z.number(),
  activeUsersLast24h: z.number(),
  totalTubes: z.number(),
  labStats: z.array(systemOverviewLabStatSchema),
});

export type SystemOverview = z.infer<typeof systemOverviewSchema>;

export const createInviteCodeRequestSchema = z.object({
  role: z.enum(['lab_admin', 'user']).optional(),
  createResearcher: z.boolean().default(false),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export type CreateInviteCodeRequest = z.infer<typeof createInviteCodeRequestSchema>;

// Response data schemas

export const labsListSchema = z.object({
  labs: z.array(labDataSchema),
});

export type LabsList = z.infer<typeof labsListSchema>;

export const labDataResponseSchema = z.object({
  lab: labDataSchema,
});

export type LabDataResponse = z.infer<typeof labDataResponseSchema>;

export const demoLimitsDataSchema = z.object({
  limits: demoLimitsSchema,
});

export type DemoLimitsData = z.infer<typeof demoLimitsDataSchema>;
