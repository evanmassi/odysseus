import { z } from 'zod';
import { positionDisplayPreferenceSchema } from '../storage/positionSchemas';

/**
 * Theme Preference Schema
 *
 * Defines the available theme options for the application.
 * - 'light': Always use light mode
 * - 'dark': Always use dark mode
 * - 'auto': Follow the operating system's theme preference
 */
export const themePreferenceSchema = z.enum(['light', 'dark', 'auto']);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

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
  theme: themePreferenceSchema.optional(),

  // Future settings can be added here:
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
