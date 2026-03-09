import { z } from 'zod';
import { demoLimitsSchema } from '../demo/demoSchemas';
import { positionDisplayConfigSchema, POSITION_DISPLAY_PRESETS } from './positionSchemas';

/**
 * Grid Configuration Schema
 * Minimal server representation; client computes derived values.
 */
export const GridConfigurationSchema = z.object({
  rows: z.number().min(1).max(20),
  cols: z.number().min(1).max(20),
  template: z.string(),
}).strict();

/**
 * Box Configuration Schema
 */
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

/**
 * Rack Configuration Schema
 */
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

/**
 * Tank Configuration Schema
 */
export const TankConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.union([z.string().datetime('Invalid created date'), z.date()]),
  updatedAt: z.union([z.string().datetime('Invalid updated date'), z.date()]),
  defaultGridConfig: GridConfigurationSchema,
  racks: z.array(RackConfigurationSchema),
  isSeeded: z.boolean().optional(),
}).strict();

/**
 * Color Scheme Schema
 */
export const ColorSchemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  text: z.string(),
}).strict();

/**
 * Equipment Configuration Schema
 */
export const EquipmentConfigurationSchema = z.object({
  tanks: z.array(TankConfigurationSchema),
  defaultBoxConfig: BoxConfigurationSchema,
  defaultGridConfig: GridConfigurationSchema,
}).strict();

/**
 * Lab Configuration Schema
 */
export const LabConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  organization: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.union([z.string().datetime('Invalid created date'), z.date()]),
  updatedAt: z.union([z.string().datetime('Invalid updated date'), z.date()]),
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

/**
 * Global Settings Schema
 */
export const GlobalSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  language: z.string().default('en'),
  timezone: z.string().default('America/New_York'),
  autoBackup: z.boolean().default(true),
}).strict();

/**
 * System Configuration Schema
 */
export const SystemConfigurationSchema = z.object({
  currentLabId: z.string(),
  availableLabs: z.array(LabConfigurationSchema),
  globalSettings: GlobalSettingsSchema,
  version: z.number(),
}).strict();

/**
 * Configuration Response Schema (pure domain type)
 */
export const ConfigurationResponseSchema = z.object({
  configuration: z.object({
    systemConfig: SystemConfigurationSchema,
    currentLab: LabConfigurationSchema,
  }),
}).strict();

/**
 * Save Configuration Request Schema
 */
export const SaveConfigurationRequestSchema = z.object({
  configuration: z.object({
    systemConfig: SystemConfigurationSchema,
    currentLab: LabConfigurationSchema,
  }),
}).strict();

/**
 * Delete Tank Response Schema
 */
export const DeleteTankResponseSchema = z.object({
  message: z.string(),
  deletedTubes: z.number(),
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
export type ConfigurationResponse = z.infer<typeof ConfigurationResponseSchema>;
export type SaveConfigurationRequest = z.infer<typeof SaveConfigurationRequestSchema>;
export type DeleteTankResponse = z.infer<typeof DeleteTankResponseSchema>;
