/**
 * Storage Analytics Schemas
 *
 * Zod schemas for storage capacity and utilization API responses.
 */

import { z } from 'zod';

export const boxUtilizationSchema = z.object({
  boxName: z.string(),
  maxPositions: z.number(),
  occupied: z.number(),
  utilizationPercent: z.number(),
});

export const rackUtilizationSchema = z.object({
  rackId: z.string(),
  rackName: z.string(),
  totalPositions: z.number(),
  occupied: z.number(),
  utilizationPercent: z.number(),
  boxes: z.array(boxUtilizationSchema),
});

export const tankUtilizationSchema = z.object({
  tankId: z.string(),
  tankName: z.string(),
  totalPositions: z.number(),
  occupied: z.number(),
  utilizationPercent: z.number(),
  racks: z.array(rackUtilizationSchema),
});

const nearCapacityBoxSchema = z.object({
  tankName: z.string(),
  rackName: z.string(),
  boxName: z.string(),
  occupied: z.number(),
  maxPositions: z.number(),
  utilizationPercent: z.number(),
});

export const labStorageAnalyticsResponseSchema = z.object({
  totalPositions: z.number(),
  totalOccupied: z.number(),
  utilizationPercent: z.number(),
  tanks: z.array(tankUtilizationSchema),
  nearCapacityBoxes: z.array(nearCapacityBoxSchema),
});

export const labStorageSummarySchema = z.object({
  labId: z.string(),
  labName: z.string(),
  totalPositions: z.number(),
  totalOccupied: z.number(),
  utilizationPercent: z.number(),
});

export const crossLabStorageAnalyticsResponseSchema = z.object({
  totalPositions: z.number(),
  totalOccupied: z.number(),
  utilizationPercent: z.number(),
  labs: z.array(labStorageSummarySchema),
});

export type BoxUtilization = z.infer<typeof boxUtilizationSchema>;
export type RackUtilization = z.infer<typeof rackUtilizationSchema>;
export type TankUtilization = z.infer<typeof tankUtilizationSchema>;
export type LabStorageAnalyticsResponse = z.infer<typeof labStorageAnalyticsResponseSchema>;
export type LabStorageSummary = z.infer<typeof labStorageSummarySchema>;
export type CrossLabStorageAnalyticsResponse = z.infer<typeof crossLabStorageAnalyticsResponseSchema>;
