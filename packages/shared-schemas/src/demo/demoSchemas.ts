/**
 * Demo Infrastructure Schemas
 *
 * Schemas for demo lab seeding, limits, and reset operations.
 */

import { z } from 'zod';

export const DEMO_LIMITS_DEFAULTS = {
  maxTanks: 3,
  maxRacksPerTank: 5,
  maxBoxesPerRack: 10,
} as const;

export const DemoLimitsSchema = z.object({
  maxTanks: z.number().int().min(0).max(50).default(DEMO_LIMITS_DEFAULTS.maxTanks),
  maxRacksPerTank: z.number().int().min(0).max(50).default(DEMO_LIMITS_DEFAULTS.maxRacksPerTank),
  maxBoxesPerRack: z.number().int().min(0).max(100).default(DEMO_LIMITS_DEFAULTS.maxBoxesPerRack),
}).strict();

export const UpdateDemoLimitsSchema = DemoLimitsSchema.partial();

export const SeedDemoResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  seededCount: z.object({
    tanks: z.number(),
    racks: z.number(),
    boxes: z.number(),
  }),
}).strict();

export const UnseedDemoResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
}).strict();

export type DemoLimits = z.infer<typeof DemoLimitsSchema>;
export type UpdateDemoLimits = z.infer<typeof UpdateDemoLimitsSchema>;
export type SeedDemoResponse = z.infer<typeof SeedDemoResponseSchema>;
export type UnseedDemoResponse = z.infer<typeof UnseedDemoResponseSchema>;
