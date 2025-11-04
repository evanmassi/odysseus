/**
 * PersonService - Profile data operations
 *
 * Handles current user's person profile retrieval and updates.
 * Person is the single source of truth for profile data.
 */

import { httpClient } from '@infra/api/httpClient';
import {
  type Person,
  type UpdatePersonProfile,
  personSchema,
  updatePersonProfileSchema
} from '@odysseus/shared-schemas';

/**
 * Extended update type including password confirmation requirement
 */
export interface UpdatePersonProfileWithPassword extends UpdatePersonProfile {
  currentPassword: string;
}

export class PersonService {
  private static readonly BASE_PATH = '/users/me/profile';

  /**
   * Get current user's person profile
   */
  static async getMyProfile(): Promise<Person> {
    return await httpClient.getData(this.BASE_PATH, personSchema);
  }

  /**
   * Update current user's person profile
   * Requires current password for security
   */
  static async updateMyProfile(data: UpdatePersonProfileWithPassword): Promise<Person> {
    const { currentPassword, ...profileData } = data;
    const validated = updatePersonProfileSchema.parse(profileData);

    return await httpClient.putData(
      this.BASE_PATH,
      { ...validated, currentPassword },
      personSchema
    );
  }
}
