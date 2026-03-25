/**
 * Storage Configuration Schemas
 *
 * Zod schemas for lab equipment hierarchy: tanks → racks → boxes → grid.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';
import { demoLimitsSchema } from '../demo/demoSchemas';
import { positionDisplayConfigSchema } from './positionSchemas';

// Minimal server representation; client computes derived values.
export const GridConfigurationSchema = z.object({
  rows: z.number().min(1).max(20),
  cols: z.number().min(1).max(20),
  template: z.string(),
}).strict();

export const BoxConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  gridConfig: GridConfigurationSchema,
  positionDisplay: positionDisplayConfigSchema.optional(),
  position: z.number().optional(),
  // null = explicitly unassigned/common, undefined = inherit from rack
  assignedUserId: z.string().nullable().optional(),
  // Users who can access tubes in this box (in addition to assignee)
  sharedWithUserIds: z.array(z.string()).optional(),
  customLabel: z.string().max(50).optional(),
  isSeeded: z.boolean().optional(),
}).strict();

export const RackConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number(),
  isActive: z.boolean().default(true),
  boxes: z.array(BoxConfigurationSchema),
  assignedUserId: z.string().optional(),
  // Users who can access tubes in this rack (in addition to assignee)
  sharedWithUserIds: z.array(z.string()).optional(),
  customLabel: z.string().max(50).optional(),
  isSeeded: z.boolean().optional(),
}).strict();

export const TankConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  isActive: z.boolean().default(true),
  createdAt: dateField,
  updatedAt: dateField,
  defaultGridConfig: GridConfigurationSchema,
  racks: z.array(RackConfigurationSchema),
  isSeeded: z.boolean().optional(),
}).strict();

export const ColorSchemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  text: z.string(),
}).strict();

export const EquipmentConfigurationSchema = z.object({
  tanks: z.array(TankConfigurationSchema),
  defaultBoxConfig: BoxConfigurationSchema,
  defaultGridConfig: GridConfigurationSchema,
}).strict();

export const LabConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  organization: z.string(),
  isActive: z.boolean().default(true),
  createdAt: dateField,
  updatedAt: dateField,
  equipment: EquipmentConfigurationSchema,
  branding: z.object({
    logo: z.string().optional(),
    colors: ColorSchemeSchema.optional(),
  }).optional(),
  settings: z.object({
    requireAuth: z.boolean(),
    allowDataExport: z.boolean(),
    enableRealTimeSync: z.boolean(),
    defaultPositionDisplay: positionDisplayConfigSchema.optional(),
  }).optional(),
  demoLimits: demoLimitsSchema.optional(),
}).strict();

export const GlobalSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  language: z.string().default('en'),
  timezone: z.string().default('America/New_York'),
  autoBackup: z.boolean().default(true),
}).strict();

export const SystemConfigurationSchema = z.object({
  currentLabId: z.string(),
  availableLabs: z.array(LabConfigurationSchema),
  globalSettings: GlobalSettingsSchema,
  version: z.number(),
}).strict();

const configurationPayloadSchema = z.object({
  systemConfig: SystemConfigurationSchema,
  currentLab: LabConfigurationSchema,
});

export const StorageResponseSchema = z.object({
  configuration: configurationPayloadSchema,
}).strict();

export const SaveStorageRequestSchema = z.object({
  configuration: configurationPayloadSchema,
}).strict();

export type GridConfiguration = z.infer<typeof GridConfigurationSchema>;
export type BoxConfiguration = z.infer<typeof BoxConfigurationSchema>;
export type RackConfiguration = z.infer<typeof RackConfigurationSchema>;
export type TankConfiguration = z.infer<typeof TankConfigurationSchema>;
export type ColorScheme = z.infer<typeof ColorSchemeSchema>;
export type EquipmentConfiguration = z.infer<typeof EquipmentConfigurationSchema>;
export type LabConfiguration = z.infer<typeof LabConfigurationSchema>;
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;
export type SystemConfiguration = z.infer<typeof SystemConfigurationSchema>;
export type StorageResponse = z.infer<typeof StorageResponseSchema>;
export type SaveStorageRequest = z.infer<typeof SaveStorageRequestSchema>;

// Response schemas

export const addTankResponseSchema = z.object({
  tankId: z.string(),
});

export type AddTankResponse = z.infer<typeof addTankResponseSchema>;

export const addRacksResponseSchema = z.object({
  rackIds: z.array(z.string()),
});

export type AddRacksResponse = z.infer<typeof addRacksResponseSchema>;

export const addBoxesResponseSchema = z.object({
  boxIds: z.array(z.string()),
});

export type AddBoxesResponse = z.infer<typeof addBoxesResponseSchema>;

export const bulkOperationResponseSchema = z.object({
  racksAffected: z.number(),
  boxesAffected: z.number(),
});

export type BulkOperationResponse = z.infer<typeof bulkOperationResponseSchema>;

export const positionDisplayPresetsResponseSchema = z.object({
  presets: z.object({
    NUMERIC: positionDisplayConfigSchema,
    ALPHANUMERIC_STANDARD: positionDisplayConfigSchema,
    ALPHANUMERIC_REVERSE: positionDisplayConfigSchema,
  }),
  description: z.record(z.string(), z.string()),
});

export type PositionDisplayPresetsResponse = z.infer<typeof positionDisplayPresetsResponseSchema>;
