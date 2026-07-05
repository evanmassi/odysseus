/**
 * User Lookup Service
 *
 * Provides user display info lookup for any authenticated user.
 */
import { usersLookupListSchema, type UserDisplayInfo } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

class UserLookupService {
  async lookupUsers(userIds: string[]): Promise<UserDisplayInfo[]> {
    if (userIds.length === 0) return [];

    const data = await httpClient.postData('/users/lookup', { userIds }, usersLookupListSchema);
    return data.users;
  }

  async listActiveUsers(): Promise<UserDisplayInfo[]> {
    const data = await httpClient.getData('/users/list', usersLookupListSchema);
    return data.users;
  }
}

export const userLookupService = new UserLookupService();
