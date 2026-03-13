/**
 * User Settings Service
 *
 * Handles user preferences and settings management.
 */
import {
  userSettingsSchema,
  type UserSettings,
  type PositionDisplayPreference,
  type ThemePreference,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api';

export class UserSettingsService {
  async getUserSettings(): Promise<UserSettings> {
    const data = await httpClient.getData(
      '/users/me/settings',
      z.object({ settings: userSettingsSchema })
    );
    return data.settings;
  }

  async updateUserSettings(settings: UserSettings): Promise<UserSettings> {
    const data = await httpClient.putData(
      '/users/me/settings',
      { settings },
      z.object({ settings: userSettingsSchema })
    );
    return data.settings;
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
