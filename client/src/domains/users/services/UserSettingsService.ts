/**
 * User Settings Application Service
 *
 * Handles user preferences and settings management.
 * Coordinates between API, domain logic, and UI layers.
 */
import {
  type UserSettings,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
  type PositionDisplayPreference
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api/httpClient';

/**
 * User Settings service for managing per-user preferences
 */
export class UserSettingsService {
  /**
   * Get current user's settings
   *
   * GET /api/users/me/settings
   * Auth required: Yes (any authenticated user)
   */
  async getUserSettings(): Promise<UserSettings> {
    try {
      const response = await httpClient.get<UserSettingsResponse>('/users/me/settings');

      if (response.data.success && response.data.settings) {
        return response.data.settings;
      }

      throw new Error('Failed to get user settings');
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Failed to get user settings');
    }
  }

  /**
   * Update current user's settings (full update)
   *
   * PUT /api/users/me/settings
   * Auth required: Yes (any authenticated user)
   */
  async updateUserSettings(settings: UserSettings): Promise<UserSettings> {
    try {
      const request: UpdateUserSettingsRequest = { settings };
      const response = await httpClient.put<UserSettingsResponse>('/users/me/settings', request);

      if (response.data.success && response.data.settings) {
        return response.data.settings;
      }

      throw new Error('Failed to update user settings');
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Failed to update user settings');
    }
  }

  /**
   * Update position display preference (convenience method)
   *
   * Updates only the defaultPositionDisplay field while preserving other settings.
   */
  async updatePositionDisplayPreference(preference: PositionDisplayPreference): Promise<UserSettings> {
    try {
      // Get current settings first
      const currentSettings = await this.getUserSettings();

      // Update only the position display preference
      const updatedSettings: UserSettings = {
        ...currentSettings,
        defaultPositionDisplay: preference
      };

      return await this.updateUserSettings(updatedSettings);
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Failed to update position display preference');
    }
  }
}

// Singleton instance
export const userSettingsService = new UserSettingsService();
