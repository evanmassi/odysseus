/**
 * User Settings Service
 *
 * Handles user preferences and settings management.
 */
import {
  type UserSettings,
  type PositionDisplayPreference,
  type ThemePreference,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class UserSettingsService {
  async getUserSettings(): Promise<UserSettings> {
    const response = await httpClient.get<{
      success: boolean;
      data: { settings: UserSettings };
    }>('/users/me/settings');

    if (response.data.success && response.data.data.settings) {
      return response.data.data.settings;
    }

    throw new Error('Failed to get user settings');
  }

  async updateUserSettings(settings: UserSettings): Promise<UserSettings> {
    const response = await httpClient.put<{
      success: boolean;
      data: { settings: UserSettings };
    }>('/users/me/settings', { settings });

    if (response.data.success && response.data.data.settings) {
      return response.data.data.settings;
    }

    throw new Error('Failed to update user settings');
  }

  async updatePositionDisplayPreference(
    preference: PositionDisplayPreference
  ): Promise<UserSettings> {
    const currentSettings = await this.getUserSettings();

    const updatedSettings: UserSettings = {
      ...currentSettings,
      defaultPositionDisplay: preference,
    };

    return await this.updateUserSettings(updatedSettings);
  }

  async updateThemePreference(theme: ThemePreference): Promise<UserSettings> {
    // Update cookie immediately for fast access on next page load
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `odysseus-theme=${theme}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    const currentSettings = await this.getUserSettings();

    const updatedSettings: UserSettings = {
      ...currentSettings,
      theme,
    };

    return await this.updateUserSettings(updatedSettings);
  }
}

export const userSettingsService = new UserSettingsService();
