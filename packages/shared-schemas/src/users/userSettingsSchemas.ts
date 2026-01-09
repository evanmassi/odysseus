import { z } from 'zod';
import { positionDisplayPreferenceSchema } from '../storage/positionSchemas';

/**
 * User Settings Schema
 *
 * Extensible schema for per-user preferences and settings.
 * All fields are optional to allow incremental addition of settings.
 *
 * Note: User preferences store format-only (numeric/alphanumeric).
 * Full configs with grid-specific alphanumericConfig are generated when applied to boxes.
 */
export const userSettingsSchema = z.object({
  defaultPositionDisplay: positionDisplayPreferenceSchema.optional(),

  // Future settings can be added here:
  // theme: z.enum(['light', 'dark', 'auto']).optional(),
  // language: z.string().optional(),
  // emailNotifications: z.boolean().optional(),
  // gridDensity: z.enum(['compact', 'normal', 'comfortable']).optional(),
}).strict();

export type UserSettings = z.infer<typeof userSettingsSchema>;

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  // No defaults set - user preferences override everything when set
};

/**
 * Request/Response schemas for API
 */
export const updateUserSettingsRequestSchema = z.object({
  settings: userSettingsSchema,
});

export type UpdateUserSettingsRequest = z.infer<typeof updateUserSettingsRequestSchema>;

export const userSettingsResponseSchema = z.object({
  success: z.boolean(),
  settings: userSettingsSchema,
});

export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;
