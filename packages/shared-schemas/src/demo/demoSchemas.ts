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

export const demoLimitsSchema = z
  .object({
    maxTanks: z.number().int().min(0).max(50).default(DEMO_LIMITS_DEFAULTS.maxTanks),
    maxRacksPerTank: z.number().int().min(0).max(50).default(DEMO_LIMITS_DEFAULTS.maxRacksPerTank),
    maxBoxesPerRack: z.number().int().min(0).max(100).default(DEMO_LIMITS_DEFAULTS.maxBoxesPerRack),
  })
  .strict();

export const updateDemoLimitsSchema = demoLimitsSchema.partial();

export const seedDemoResponseSchema = z
  .object({
    message: z.string(),
    seededCount: z.object({
      tanks: z.number(),
      racks: z.number(),
      boxes: z.number(),
    }),
  })
  .strict();

export const unseedDemoResponseSchema = z
  .object({
    message: z.string(),
  })
  .strict();

export type DemoLimits = z.infer<typeof demoLimitsSchema>;
export type SeedDemoResponse = z.infer<typeof seedDemoResponseSchema>;
export type UnseedDemoResponse = z.infer<typeof unseedDemoResponseSchema>;
