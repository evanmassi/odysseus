/**
 * User Settings Schemas
 *
 * Per-user preferences and settings schemas for theme and position display.
 */

import { z } from 'zod';
import { positionDisplayPreferenceSchema } from '../storage/positionSchemas';

export const themePreferenceSchema = z.enum(['light', 'dark', 'auto']);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

/**
 * Note: User preferences store format-only (numeric/alphanumeric).
 * Full configs with grid-specific alphanumericConfig are generated when applied to boxes.
 */
export const userSettingsSchema = z.object({
  defaultPositionDisplay: positionDisplayPreferenceSchema.optional(),
  theme: themePreferenceSchema.optional(),
}).strict();

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  // No defaults set - user preferences override everything when set
};

export const updateUserSettingsRequestSchema = z.object({
  settings: userSettingsSchema,
});

export type UpdateUserSettingsRequest = z.infer<typeof updateUserSettingsRequestSchema>;

export const userSettingsResponseSchema = z.object({
  success: z.boolean(),
  settings: userSettingsSchema,
});

export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;
