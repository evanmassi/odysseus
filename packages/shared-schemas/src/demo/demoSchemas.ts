/**
 * Demo Infrastructure Schemas
 *
 * Schemas for demo lab seeding, limits, and reset operations.
 */

import { z } from 'zod';

// Every limit counts only what a visitor added — seeded records never consume the budget.
export const DEMO_LIMITS_DEFAULTS = {
  maxTanks: 3,
  maxRacksPerTank: 5,
  maxBoxesPerRack: 10,
  maxTubes: 200,
  maxDonors: 25,
  maxItemsPerCatalog: 50,
} as const;

export const demoLimitsSchema = z
  .object({
    maxTanks: z.number().int().min(0).max(50).default(DEMO_LIMITS_DEFAULTS.maxTanks),
    maxRacksPerTank: z.number().int().min(0).max(50).default(DEMO_LIMITS_DEFAULTS.maxRacksPerTank),
    maxBoxesPerRack: z.number().int().min(0).max(100).default(DEMO_LIMITS_DEFAULTS.maxBoxesPerRack),
    maxTubes: z.number().int().min(0).max(5000).default(DEMO_LIMITS_DEFAULTS.maxTubes),
    maxDonors: z.number().int().min(0).max(500).default(DEMO_LIMITS_DEFAULTS.maxDonors),
    maxItemsPerCatalog: z
      .number()
      .int()
      .min(0)
      .max(500)
      .default(DEMO_LIMITS_DEFAULTS.maxItemsPerCatalog),
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
