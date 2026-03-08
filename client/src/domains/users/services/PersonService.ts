/**
 * Person Profile Service
 *
 * Handles current user's person profile retrieval and updates.
 */
import {
  type Person,
  type UpdatePersonProfile,
  personSchema,
  updatePersonProfileSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api/HttpClient';

/** Extended update type including password confirmation requirement. */
export interface UpdatePersonProfileWithPassword extends UpdatePersonProfile {
  currentPassword: string;
}

export class PersonService {
  private static readonly BASE_PATH = '/users/me/profile';

  static async getMyProfile(): Promise<Person> {
    return await httpClient.getData(this.BASE_PATH, personSchema);
  }

  /** Requires current password for security. */
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
