/**
 * User Settings Service
 *
 * Handles user preferences and settings management.
 */
import { userSettingsDataSchema, type UserSettings } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

class UserSettingsService {
  async getUserSettings(): Promise<UserSettings> {
    const data = await httpClient.getData('/users/me/settings', userSettingsDataSchema);
    return data.settings;
  }

  async updateUserSettings(settings: UserSettings): Promise<UserSettings> {
    const data = await httpClient.putData(
      '/users/me/settings',
      { settings },
      userSettingsDataSchema
    );
    return data.settings;
  }
}

export const userSettingsService = new UserSettingsService();
